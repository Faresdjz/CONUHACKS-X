from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import uuid
import requests

from config import SEARCH_WEIGHTS
from models import (
    ItemResponse, ItemUpdate, ItemListResponse, ItemStatus,
    InquiryResponse, InquiryListResponse, InquiryStatus,
    MatchResponse, MatchListResponse, MatchStatus, MatchScores,
    SearchResult, SearchResponse,
    VerificationQuestionsResponse,
    SystemStats, CollectionStats, HealthResponse
)
import supabase_client as db
import milvus
from embeddings import embed_image_dino, embed_image_clip, embed_text_clip
from gemini import generate_caption, extract_text_from_image, generate_verification_questions

app = FastAPI(
    title="Lost and Found API",
    description="Multimodal matching system for lost items using DINOv2, CLIP, and Gemini",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Startup Event ==============

@app.on_event("startup")
async def startup_event():
    """Initialize Milvus collections on startup."""
    try:
        milvus.init_collections(drop_existing=False)
        print("Milvus collections initialized")
    except Exception as e:
        print(f"Warning: Could not initialize Milvus: {e}")


# ============== Health & Stats ==============

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check system health."""
    milvus_ok = False
    supabase_ok = False
    
    try:
        milvus.get_collection_stats()
        milvus_ok = True
    except:
        pass
    
    try:
        db.get_items(limit=1)
        supabase_ok = True
    except:
        pass
    
    return HealthResponse(
        status="ok" if milvus_ok and supabase_ok else "degraded",
        milvus_connected=milvus_ok,
        supabase_connected=supabase_ok
    )


@app.get("/stats", response_model=SystemStats)
async def get_stats():
    """Get system statistics."""
    milvus_stats = milvus.get_collection_stats()
    items_response = db.get_items(limit=1)
    
    return SystemStats(
        dino_collection=CollectionStats(**milvus_stats.get("dino_collection", {"exists": False})),
        clip_image_collection=CollectionStats(**milvus_stats.get("clip_image_collection", {"exists": False})),
        clip_caption_collection=CollectionStats(**milvus_stats.get("clip_caption_collection", {"exists": False})),
        total_items=len(items_response.data) if items_response.data else 0
    )


# ============== Inventory Management (Assistant Only) ==============

@app.post("/inventory/items", response_model=ItemResponse)
async def create_item(
    image: UploadFile = File(...),
    category: Optional[str] = Form(None)
):
    """
    Add a new item to the inventory.
    
    Pipeline:
    1. Upload image to Supabase Storage
    2. Generate caption with Gemini
    3. Extract text/OCR with Gemini
    4. Generate embeddings (DINOv2 + CLIP image + CLIP caption)
    5. Insert into all 3 Milvus collections
    6. Insert metadata into Supabase
    """
    try:
        # Read image bytes
        image_bytes = await image.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Generate unique ID
        item_id = str(uuid.uuid4())
        
        # 1. Upload to Supabase Storage
        file_path = f"items/{item_id}.jpg"
        image_url = db.upload_image("lost-items", file_path, image_bytes)
        
        # 2. Generate caption with Gemini
        caption = generate_caption(image_bytes)
        
        # 3. Extract text with Gemini OCR
        extracted_text = extract_text_from_image(image_bytes)
        
        # 4. Generate embeddings
        dino_embedding = embed_image_dino(pil_image)
        clip_image_embedding = embed_image_clip(pil_image)
        clip_caption_embedding = embed_text_clip(caption)
        
        # 5. Insert into Milvus collections
        milvus.insert_item_embeddings(
            item_id=item_id,
            dino_embedding=dino_embedding,
            clip_image_embedding=clip_image_embedding,
            clip_caption_embedding=clip_caption_embedding
        )
        
        # 6. Insert into Supabase
        result = db.supabase.table("items").insert({
            "id": item_id,
            "image_url": image_url,
            "caption": caption,
            "extracted_text": extracted_text,
            "category": category,
            "status": "available"
        }).execute()
        
        item_data = result.data[0]
        return ItemResponse(
            id=item_data["id"],
            image_url=item_data["image_url"],
            caption=item_data["caption"],
            extracted_text=item_data["extracted_text"],
            category=item_data["category"],
            status=ItemStatus(item_data["status"]),
            created_at=item_data["created_at"],
            updated_at=item_data["updated_at"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/items", response_model=ItemListResponse)
async def list_items(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None
):
    """List all items in the inventory."""
    try:
        result = db.get_items(limit=limit, offset=offset, status=status)
        items = [
            ItemResponse(
                id=item["id"],
                image_url=item["image_url"],
                caption=item.get("caption"),
                extracted_text=item.get("extracted_text"),
                category=item.get("category"),
                status=ItemStatus(item["status"]),
                created_at=item["created_at"],
                updated_at=item["updated_at"]
            )
            for item in result.data
        ]
        return ItemListResponse(items=items, total=len(items))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inventory/items/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str):
    """Get a specific item by ID."""
    try:
        result = db.get_item(item_id)
        item = result.data
        return ItemResponse(
            id=item["id"],
            image_url=item["image_url"],
            caption=item.get("caption"),
            extracted_text=item.get("extracted_text"),
            category=item.get("category"),
            status=ItemStatus(item["status"]),
            created_at=item["created_at"],
            updated_at=item["updated_at"]
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Item not found")


@app.put("/inventory/items/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, update: ItemUpdate):
    """Update an item's metadata."""
    try:
        updates = {}
        if update.category is not None:
            updates["category"] = update.category
        if update.status is not None:
            updates["status"] = update.status.value
        
        if updates:
            db.update_item(item_id, updates)
        
        return await get_item(item_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/inventory/items/{item_id}")
async def delete_item(item_id: str):
    """Delete an item from inventory and all Milvus collections."""
    try:
        # Delete from Milvus
        milvus.delete_item_embeddings(item_id)
        
        # Delete from Supabase
        db.delete_item(item_id)
        
        return {"message": "Item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Inquiries (User) ==============

@app.post("/inquiries", response_model=InquiryResponse)
async def create_inquiry(
    image: Optional[UploadFile] = File(None),
    description: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None)
):
    """
    Submit a new inquiry for a lost item.
    User can provide image, text description, or both.
    """
    if not image and not description:
        raise HTTPException(status_code=400, detail="Must provide either image or description")
    
    try:
        image_url = None
        inquiry_id = str(uuid.uuid4())
        
        # Upload image if provided
        if image:
            image_bytes = await image.read()
            file_path = f"inquiries/{inquiry_id}.jpg"
            image_url = db.upload_image("inquiries", file_path, image_bytes)
        
        # Create inquiry in Supabase
        result = db.create_inquiry(
            user_id=user_id,
            image_url=image_url,
            description=description
        )
        
        inquiry_data = result.data[0]
        return InquiryResponse(
            id=inquiry_data["id"],
            user_id=inquiry_data.get("user_id"),
            image_url=inquiry_data.get("image_url"),
            description=inquiry_data.get("description"),
            status=InquiryStatus(inquiry_data["status"]),
            created_at=inquiry_data["created_at"],
            updated_at=inquiry_data["updated_at"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inquiries", response_model=InquiryListResponse)
async def list_inquiries(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    user_id: Optional[str] = None
):
    """List inquiries with optional filtering."""
    try:
        result = db.get_inquiries(limit=limit, offset=offset, status=status, user_id=user_id)
        inquiries = [
            InquiryResponse(
                id=inq["id"],
                user_id=inq.get("user_id"),
                image_url=inq.get("image_url"),
                description=inq.get("description"),
                status=InquiryStatus(inq["status"]),
                created_at=inq["created_at"],
                updated_at=inq["updated_at"]
            )
            for inq in result.data
        ]
        return InquiryListResponse(inquiries=inquiries, total=len(inquiries))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inquiries/{inquiry_id}", response_model=InquiryResponse)
async def get_inquiry(inquiry_id: str):
    """Get a specific inquiry by ID."""
    try:
        result = db.get_inquiry(inquiry_id)
        inq = result.data
        return InquiryResponse(
            id=inq["id"],
            user_id=inq.get("user_id"),
            image_url=inq.get("image_url"),
            description=inq.get("description"),
            status=InquiryStatus(inq["status"]),
            created_at=inq["created_at"],
            updated_at=inq["updated_at"]
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Inquiry not found")


@app.get("/inquiries/{inquiry_id}/matches", response_model=MatchListResponse)
async def get_inquiry_matches(inquiry_id: str):
    """Get all matches for an inquiry."""
    try:
        result = db.get_matches_for_inquiry(inquiry_id)
        matches = [
            MatchResponse(
                id=m["id"],
                inquiry_id=m["inquiry_id"],
                item_id=m["item_id"],
                img_to_img_score=m.get("img_to_img_score"),
                img_to_caption_score=m.get("img_to_caption_score"),
                desc_to_img_score=m.get("desc_to_img_score"),
                desc_to_caption_score=m.get("desc_to_caption_score"),
                combined_score=m["combined_score"],
                status=MatchStatus(m["status"]),
                reviewed_by=m.get("reviewed_by"),
                created_at=m["created_at"]
            )
            for m in result.data
        ]
        return MatchListResponse(matches=matches, total=len(matches))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Search & Matching ==============

@app.post("/inquiries/{inquiry_id}/search", response_model=SearchResponse)
async def search_for_matches(inquiry_id: str, top_k: int = 10):
    """
    Trigger 4-way search for an inquiry and store results.
    
    Comparisons:
    1. Image → Image (DINOv2)
    2. Image → Caption (CLIP)
    3. Description → Image (CLIP)
    4. Description → Caption (CLIP)
    """
    try:
        # Get inquiry
        inquiry_result = db.get_inquiry(inquiry_id)
        inquiry = inquiry_result.data
        
        image_url = inquiry.get("image_url")
        description = inquiry.get("description")
        
        results = {}
        
        # If user provided an image
        if image_url:
            img_response = requests.get(image_url)
            image_bytes = img_response.content
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            dino_emb = embed_image_dino(pil_image)
            clip_img_emb = embed_image_clip(pil_image)
            
            # 1. Image → Image (DINOv2)
            results["img_to_img"] = milvus.search_dino(dino_emb, top_k=top_k * 2)
            
            # 2. Image → Caption (CLIP)
            results["img_to_caption"] = milvus.search_clip_caption(clip_img_emb, top_k=top_k * 2)
        
        # If user provided a description
        if description:
            clip_txt_emb = embed_text_clip(description)
            
            # 3. Description → Image (CLIP)
            results["desc_to_img"] = milvus.search_clip_image(clip_txt_emb, top_k=top_k * 2)
            
            # 4. Description → Caption (CLIP)
            results["desc_to_caption"] = milvus.search_clip_caption(clip_txt_emb, top_k=top_k * 2)
        
        # Merge and rank results
        ranked_results = merge_and_rank(results, SEARCH_WEIGHTS)[:top_k]
        
        # Update inquiry status
        db.update_inquiry_status(inquiry_id, "under_review")
        
        # Store matches in database
        search_results = []
        for r in ranked_results:
            item_id = r["item_id"]
            scores = r["scores"]
            
            # Create match record
            db.create_match(inquiry_id, item_id, {
                "img_to_img": scores.get("img_to_img"),
                "img_to_caption": scores.get("img_to_caption"),
                "desc_to_img": scores.get("desc_to_img"),
                "desc_to_caption": scores.get("desc_to_caption"),
                "total": r["total"]
            })
            
            # Get item details
            try:
                item_result = db.get_item(item_id)
                item_data = item_result.data
                item = ItemResponse(
                    id=item_data["id"],
                    image_url=item_data["image_url"],
                    caption=item_data.get("caption"),
                    extracted_text=item_data.get("extracted_text"),
                    category=item_data.get("category"),
                    status=ItemStatus(item_data["status"]),
                    created_at=item_data["created_at"],
                    updated_at=item_data["updated_at"]
                )
            except:
                item = None
            
            search_results.append(SearchResult(
                item_id=item_id,
                scores=MatchScores(
                    img_to_img=scores.get("img_to_img"),
                    img_to_caption=scores.get("img_to_caption"),
                    desc_to_img=scores.get("desc_to_img"),
                    desc_to_caption=scores.get("desc_to_caption"),
                    total=r["total"]
                ),
                item=item
            ))
        
        return SearchResponse(
            inquiry_id=inquiry_id,
            results=search_results,
            total=len(search_results)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def merge_and_rank(results: dict, weights: dict) -> list[dict]:
    """Combine scores from all search types with weighted averaging."""
    item_scores = {}
    
    for search_type, hits in results.items():
        weight = weights.get(search_type, 0.25)
        for hit in hits:
            item_id = hit["id"]
            score = hit["distance"]  # Cosine similarity from Milvus
            
            if item_id not in item_scores:
                item_scores[item_id] = {"scores": {}, "total": 0}
            
            item_scores[item_id]["scores"][search_type] = score
            item_scores[item_id]["total"] += score * weight
    
    # Sort by combined score (higher is better for cosine similarity)
    ranked = sorted(item_scores.items(), key=lambda x: x[1]["total"], reverse=True)
    return [{"item_id": k, **v} for k, v in ranked]


# ============== Match Management (Assistant) ==============

@app.get("/matches/pending", response_model=MatchListResponse)
async def get_pending_matches(limit: int = 100):
    """Get all pending matches for assistant review."""
    try:
        result = db.get_pending_matches(limit=limit)
        matches = [
            MatchResponse(
                id=m["id"],
                inquiry_id=m["inquiry_id"],
                item_id=m["item_id"],
                img_to_img_score=m.get("img_to_img_score"),
                img_to_caption_score=m.get("img_to_caption_score"),
                desc_to_img_score=m.get("desc_to_img_score"),
                desc_to_caption_score=m.get("desc_to_caption_score"),
                combined_score=m["combined_score"],
                status=MatchStatus(m["status"]),
                reviewed_by=m.get("reviewed_by"),
                created_at=m["created_at"]
            )
            for m in result.data
        ]
        return MatchListResponse(matches=matches, total=len(matches))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/matches/{match_id}/approve")
async def approve_match(match_id: str, reviewed_by: Optional[str] = None):
    """Approve a match."""
    try:
        # Update match status
        db.update_match_status(match_id, "approved", reviewed_by)
        
        # Get match to update inquiry and item
        match_result = db.get_match(match_id)
        match_data = match_result.data
        
        # Update inquiry status to matched
        db.update_inquiry_status(match_data["inquiry_id"], "matched")
        
        # Update item status to matched
        db.update_item(match_data["item_id"], {"status": "matched"})
        
        return {"message": "Match approved", "match_id": match_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/matches/{match_id}/reject")
async def reject_match(match_id: str, reviewed_by: Optional[str] = None):
    """Reject a match."""
    try:
        db.update_match_status(match_id, "rejected", reviewed_by)
        return {"message": "Match rejected", "match_id": match_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Verification (Fraud Prevention) ==============

@app.get("/items/{item_id}/verification-questions", response_model=VerificationQuestionsResponse)
async def get_verification_questions(item_id: str):
    """Generate verification questions for an item (fraud prevention)."""
    try:
        item_result = db.get_item(item_id)
        item = item_result.data
        
        questions = generate_verification_questions(
            caption=item.get("caption", ""),
            extracted_text=item.get("extracted_text", "")
        )
        
        return VerificationQuestionsResponse(
            questions=questions,
            item_id=item_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Initialize Collections Endpoint ==============

@app.post("/admin/init-collections")
async def init_collections(drop_existing: bool = False):
    """Initialize Milvus collections (admin only)."""
    try:
        milvus.init_collections(drop_existing=drop_existing)
        return {"message": "Collections initialized", "stats": milvus.get_collection_stats()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
