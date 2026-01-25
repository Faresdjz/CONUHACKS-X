from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import uuid
import requests

from config import SEARCH_WEIGHTS
from models import (
    ItemResponse, ItemUpdate, ItemListResponse, ItemStatus,
    InquiryResponse, InquiryListResponse, InquiryStatus, InquiryStatusUpdate,
    MatchResponse, MatchListResponse, MatchStatus, MatchScores,
    SearchResult, SearchResponse,
    VerificationQuestionsResponse,
    SystemStats, CollectionStats, HealthResponse,
    CollectionResponse, CollectionListResponse, CollectionCreate,
    FollowUpQuestionResponse, FollowUpQuestionsListResponse, 
    FollowUpQuestionCreate, FollowUpResponseSubmit, GeneratedQuestionsResponse
)
import supabase_client as db
import milvus
from embeddings import embed_image_dino, embed_image_clip, embed_text_clip, embed_text
from gemini import generate_caption, extract_text_from_image, generate_verification_questions, generate_follow_up_questions
from auth import get_current_user, get_optional_user

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
        sentence_embedding_collection=CollectionStats(**milvus_stats.get("sentence_embedding_collection", {"exists": False})),
        total_items=len(items_response.data) if items_response.data else 0
    )


# ============== Inventory Management (Assistant Only) ==============

@app.post("/inventory/items", response_model=ItemResponse)
async def create_item(
    image: UploadFile = File(...),
    category: Optional[str] = Form(None),
    collection_id: Optional[str] = Form(None)
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
    print(f"[CREATE ITEM] category={category}, collection_id={collection_id}")
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
        sentence_embedding = embed_text(caption) if caption else [0.0] * 384  # Generate sentence embedding for caption
        
        # 5. Insert into Milvus collections
        milvus.insert_item_embeddings(
            item_id=item_id,
            dino_embedding=dino_embedding,
            clip_image_embedding=clip_image_embedding,
            clip_caption_embedding=clip_caption_embedding,
            sentence_embedding=sentence_embedding
        )
        
        # 6. Insert into Supabase
        insert_data = {
            "id": item_id,
            "image_url": image_url,
            "caption": caption,
            "extracted_text": extracted_text,
            "category": category,
            "collection_id": collection_id,
            "status": "available"
        }
        print(f"[CREATE ITEM] Inserting: {insert_data}")
        result = db.supabase.table("items").insert(insert_data).execute()
        print(f"[CREATE ITEM] Result: {result.data}")
        
        item_data = result.data[0]
        return ItemResponse(
            id=item_data["id"],
            image_url=item_data["image_url"],
            caption=item_data["caption"],
            extracted_text=item_data["extracted_text"],
            category=item_data["category"],
            collection_id=item_data.get("collection_id"),
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
                collection_id=item.get("collection_id"),
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
            collection_id=item.get("collection_id"),
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
        if update.collection_id is not None:
            updates["collection_id"] = update.collection_id
        
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


# ============== Collections Management ==============

@app.get("/collections", response_model=CollectionListResponse)
async def list_collections():
    """List all collections with item counts."""
    try:
        result = db.get_collections()
        collections = [
            CollectionResponse(
                id=c["id"],
                name=c["name"],
                created_at=c["created_at"],
                item_count=c.get("item_count", 0)
            )
            for c in result.data
        ]
        return CollectionListResponse(collections=collections, total=len(collections))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/collections/by-name/{name}", response_model=CollectionResponse)
async def get_collection_by_name(name: str):
    """Get a collection by name (case-insensitive). Returns 404 if not found."""
    try:
        result = db.get_collection_by_name(name)
        if not result.data:
            raise HTTPException(status_code=404, detail="Collection not found")
        c = result.data[0]
        # Get item count
        items_result = db.get_items_by_collection(c["id"])
        return CollectionResponse(
            id=c["id"],
            name=c["name"],
            created_at=c["created_at"],
            item_count=len(items_result.data) if items_result.data else 0
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/collections", response_model=CollectionResponse)
async def create_collection(collection: CollectionCreate):
    """Create a new collection. Name must be unique (case-insensitive)."""
    try:
        # Check if collection with same name already exists
        existing = db.get_collection_by_name(collection.name)
        if existing.data:
            raise HTTPException(status_code=400, detail="A collection with this name already exists")
        
        result = db.create_collection(collection.name)
        c = result.data[0]
        return CollectionResponse(
            id=c["id"],
            name=c["name"],
            created_at=c["created_at"],
            item_count=0
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/collections/{collection_id}", response_model=CollectionResponse)
async def get_collection(collection_id: str):
    """Get a specific collection by ID."""
    try:
        result = db.get_collection(collection_id)
        c = result.data
        return CollectionResponse(
            id=c["id"],
            name=c["name"],
            created_at=c["created_at"],
            item_count=c.get("item_count", 0)
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="Collection not found")


@app.get("/collections/{collection_id}/items", response_model=ItemListResponse)
async def get_collection_items(collection_id: str):
    """Get all items in a collection."""
    try:
        result = db.get_items_by_collection(collection_id)
        items = [
            ItemResponse(
                id=item["id"],
                image_url=item["image_url"],
                caption=item.get("caption"),
                extracted_text=item.get("extracted_text"),
                category=item.get("category"),
                collection_id=item.get("collection_id"),
                status=ItemStatus(item["status"]),
                created_at=item["created_at"],
                updated_at=item["updated_at"]
            )
            for item in result.data
        ]
        return ItemListResponse(items=items, total=len(items))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str):
    """Delete a collection (items are unlinked, not deleted)."""
    try:
        db.delete_collection(collection_id)
        return {"message": "Collection deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Inquiries (User) ==============

@app.post("/inquiries", response_model=InquiryResponse)
async def create_inquiry(
    image: Optional[UploadFile] = File(None),
    description: Optional[str] = Form(None),
    collection_name: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user)
):
    """
    Submit a new inquiry for a lost item.
    User can provide image, text description, or both.
    Requires authentication - user_id is extracted from JWT token.
    """
    if not image and not description:
        raise HTTPException(status_code=400, detail="Must provide either image or description")
    
    try:
        image_url = None
        inquiry_id = str(uuid.uuid4())
        collection_id = None

        # Look up collection if provided
        if collection_name:
            # Try to find existing collection (trim whitespace for safety)
            collection_name_trimmed = collection_name.strip()
            collection_result = db.get_collection_by_name(collection_name_trimmed)
            if collection_result.data:
                collection_id = collection_result.data[0]["id"]
                print(f"Found collection '{collection_name_trimmed}' with ID: {collection_id}")
            else:
                print(f"Collection '{collection_name_trimmed}' not found")
        
        # Upload image if provided
        if image:
            image_bytes = await image.read()
            file_path = f"inquiries/{inquiry_id}.jpg"
            image_url = db.upload_image("inquiries", file_path, image_bytes)
        
        # Create inquiry in Supabase with authenticated user_id
        result = db.create_inquiry(
            user_id=user_id,
            image_url=image_url,
            description=description,
            collection_id=collection_id
        )
        
        inquiry_data = result.data[0]
        return InquiryResponse(
            id=inquiry_data["id"],
            user_id=inquiry_data.get("user_id"),
            image_url=inquiry_data.get("image_url"),
            description=inquiry_data.get("description"),
            collection_id=inquiry_data.get("collection_id"),
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
    user_id: str = Depends(get_current_user)
):
    """List inquiries for the authenticated user."""
    try:
        # Only return inquiries for the authenticated user
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
                desc_to_desc_score=m.get("desc_to_desc_score"),
                combined_score=m["combined_score"],
                status=MatchStatus(m["status"]),
                reviewed_by=m.get("reviewed_by"),
                created_at=m["created_at"],
                item=ItemResponse(
                    id=m["items"]["id"],
                    image_url=m["items"]["image_url"],
                    caption=m["items"].get("caption"),
                    extracted_text=m["items"].get("extracted_text"),
                    category=m["items"].get("category"),
                    collection_id=m["items"].get("collection_id"),
                    status=ItemStatus(m["items"]["status"]),
                    created_at=m["items"]["created_at"],
                    updated_at=m["items"]["updated_at"]
                ) if m.get("items") else None
            )
            for m in result.data
        ]
        return MatchListResponse(matches=matches, total=len(matches))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Admin/Assistant Endpoints ==============

@app.get("/admin/inquiries", response_model=InquiryListResponse)
async def list_all_inquiries(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    collection_id: Optional[str] = None
):
    """List all inquiries for admin/assistant review (no user filtering). Optionally filter by collection."""
    try:
        result = db.get_inquiries(limit=limit, offset=offset, status=status, user_id=None, collection_id=collection_id)
        inquiries = [
            InquiryResponse(
                id=inq["id"],
                user_id=inq.get("user_id"),
                image_url=inq.get("image_url"),
                description=inq.get("description"),
                collection_id=inq.get("collection_id"),
                status=InquiryStatus(inq["status"]),
                created_at=inq["created_at"],
                updated_at=inq["updated_at"]
            )
            for inq in result.data
        ]
        return InquiryListResponse(inquiries=inquiries, total=len(inquiries))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/inquiries/{inquiry_id}/status")
async def update_inquiry_status_endpoint(inquiry_id: str, update: InquiryStatusUpdate):
    """Update inquiry status directly."""
    try:
        db.update_inquiry_status(inquiry_id, update.status.value)
        return {"message": "Status updated", "inquiry_id": inquiry_id, "status": update.status.value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== Search & Matching ==============

@app.post("/inquiries/{inquiry_id}/search", response_model=SearchResponse)
async def search_for_matches(inquiry_id: str, top_k: int = 10):
    """
    Trigger search for an inquiry and store results.
    
    Comparisons:
    1. Image → Image (DINOv2)
    2. Image → Caption (CLIP)
    3. Description → Image (CLIP)
    4. Description → Caption (CLIP)
    5. Description → Description (Sentence Embeddings) - only for description-to-description
    """
    try:
        # Get inquiry
        inquiry_result = db.get_inquiry(inquiry_id)
        inquiry = inquiry_result.data
        
        image_url = inquiry.get("image_url")
        description = inquiry.get("description")
        inquiry_collection_id = inquiry.get("collection_id")
        
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
            sentence_txt_emb = embed_text(description)  # Sentence embedding for description-to-description
            
            # 3. Description → Image (CLIP)
            results["desc_to_img"] = milvus.search_clip_image(clip_txt_emb, top_k=top_k * 2)
            
            # 4. Description → Caption (CLIP)
            results["desc_to_caption"] = milvus.search_clip_caption(clip_txt_emb, top_k=top_k * 2)
            
            # 5. Description → Description (Sentence Embeddings) - only description-to-description
            results["desc_to_desc"] = milvus.search_sentence_embedding(sentence_txt_emb, top_k=top_k * 2)
        
        # Merge and rank results
        ranked_results = merge_and_rank(results, SEARCH_WEIGHTS)
        
        # Filter results to only include items from the same collection and exclude taken items
        filtered_results = []
        for r in ranked_results:
            try:
                item_result = db.get_item(r["item_id"])
                if item_result.data:
                    item_status = item_result.data.get("status")
                    # Exclude items that are matched or claimed (taken)
                    if item_status in ["matched", "claimed"]:
                        continue
                    # If collection_id is specified, only include items from that collection
                    if inquiry_collection_id:
                        if item_result.data.get("collection_id") == inquiry_collection_id:
                            filtered_results.append(r)
                    else:
                        filtered_results.append(r)
            except:
                pass
        ranked_results = filtered_results[:top_k]
        
        # Update inquiry status
        db.update_inquiry_status(inquiry_id, "under_review")
        
        # Clear existing matches for this inquiry before adding new ones
        db.delete_matches_for_inquiry(inquiry_id)
        
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
                "desc_to_desc": scores.get("desc_to_desc"),
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
                    collection_id=item_data.get("collection_id"),
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
                    desc_to_desc=scores.get("desc_to_desc"),
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
    # All possible score types
    all_score_types = ["img_to_img", "img_to_caption", "desc_to_img", "desc_to_caption", "desc_to_desc"]
    
    item_scores = {}
    
    for search_type, hits in results.items():
        weight = weights.get(search_type, 0.25)
        for hit in hits:
            item_id = hit["id"]
            score = hit["distance"]  # Cosine similarity from Milvus
            
            if item_id not in item_scores:
                # Initialize all scores to 0
                item_scores[item_id] = {"scores": {st: 0 for st in all_score_types}, "total": 0}
            
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
                desc_to_desc_score=m.get("desc_to_desc_score"),
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


# ============== Follow-Up Questions ==============

@app.post("/inquiries/{inquiry_id}/generate-questions", response_model=GeneratedQuestionsResponse)
async def generate_questions_for_inquiry(inquiry_id: str):
    """Generate AI follow-up questions for an inquiry based on its description."""
    try:
        # Get the inquiry
        inquiry_result = db.get_inquiry(inquiry_id)
        inquiry = inquiry_result.data
        
        # Generate questions using Gemini
        questions = generate_follow_up_questions(
            description=inquiry.get("description"),
            image_url=inquiry.get("image_url")
        )
        
        return GeneratedQuestionsResponse(questions=questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/inquiries/{inquiry_id}/follow-up", response_model=FollowUpQuestionsListResponse)
async def send_follow_up_questions(inquiry_id: str, data: FollowUpQuestionCreate):
    """Save follow-up questions for an inquiry and update status to follow_up."""
    try:
        # Verify inquiry exists
        inquiry_result = db.get_inquiry(inquiry_id)
        if not inquiry_result.data:
            raise HTTPException(status_code=404, detail="Inquiry not found")
        
        # Create follow-up questions in database
        result = db.create_follow_up_questions(inquiry_id, data.questions)
        
        # Update inquiry status to follow_up
        db.update_inquiry_status(inquiry_id, "follow_up")
        
        # Return the created questions
        questions = [
            FollowUpQuestionResponse(
                id=q["id"],
                inquiry_id=q["inquiry_id"],
                question=q["question"],
                question_type=q.get("question_type", "text"),
                options=q.get("options"),
                response=q.get("response"),
                created_at=q["created_at"],
                updated_at=q["updated_at"]
            )
            for q in result.data
        ]
        
        return FollowUpQuestionsListResponse(questions=questions, total=len(questions))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/inquiries/{inquiry_id}/follow-up", response_model=FollowUpQuestionsListResponse)
async def get_follow_up_questions_for_inquiry(inquiry_id: str):
    """Get all follow-up questions for an inquiry."""
    try:
        result = db.get_follow_up_questions(inquiry_id)
        questions = [
            FollowUpQuestionResponse(
                id=q["id"],
                inquiry_id=q["inquiry_id"],
                question=q["question"],
                question_type=q.get("question_type", "text"),
                options=q.get("options"),
                response=q.get("response"),
                created_at=q["created_at"],
                updated_at=q["updated_at"]
            )
            for q in result.data
        ]
        return FollowUpQuestionsListResponse(questions=questions, total=len(questions))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/follow-up/{question_id}/respond", response_model=FollowUpQuestionResponse)
async def submit_follow_up_response(question_id: str, data: FollowUpResponseSubmit):
    """Submit a response to a follow-up question. Auto-triggers search when all questions are answered."""
    try:
        # Update the question with the response
        result = db.update_follow_up_response(question_id, data.response)
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Question not found")
        
        q = result.data[0]
        inquiry_id = q["inquiry_id"]
        
        # Check if all questions for this inquiry are now answered
        all_questions = db.get_follow_up_questions(inquiry_id)
        all_answered = all(question.get("response") for question in all_questions.data)
        
        # If all answered, automatically trigger search with responses
        if all_answered and all_questions.data:
            print(f"All follow-up questions answered for inquiry {inquiry_id}. Auto-triggering search...")
            # Trigger the search in the background (don't wait for it)
            try:
                await search_with_follow_up_responses(inquiry_id)
                print(f"Auto-search completed for inquiry {inquiry_id}")
            except Exception as search_error:
                print(f"Auto-search failed for inquiry {inquiry_id}: {search_error}")
        
        return FollowUpQuestionResponse(
            id=q["id"],
            inquiry_id=q["inquiry_id"],
            question=q["question"],
            question_type=q.get("question_type", "text"),
            options=q.get("options"),
            response=q.get("response"),
            created_at=q["created_at"],
            updated_at=q["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/inquiries/{inquiry_id}/search-with-responses", response_model=SearchResponse)
async def search_with_follow_up_responses(inquiry_id: str, top_k: int = 10):
    """
    Re-run search for an inquiry using enhanced description from follow-up responses.
    Combines original description with all answered follow-up questions.
    """
    try:
        # Get inquiry
        inquiry_result = db.get_inquiry(inquiry_id)
        inquiry = inquiry_result.data
        inquiry_collection_id = inquiry.get("collection_id")
        
        # Get follow-up questions and responses
        followup_result = db.get_follow_up_questions(inquiry_id)
        
        # Build enhanced description
        original_description = inquiry.get("description") or ""
        
        # Add follow-up Q&A to description
        followup_text = []
        for q in followup_result.data:
            if q.get("response"):  # Only include answered questions
                followup_text.append(q['response'])
        
        if followup_text:
            enhanced_description = f"{original_description}\n\nAdditional details: " + " ".join(followup_text)
        else:
            enhanced_description = original_description
        
        print(f"Enhanced description for inquiry {inquiry_id}:\n{enhanced_description}")
        
        image_url = inquiry.get("image_url")
        
        results = {}
        
        # If user provided an image
        if image_url:
            img_response = requests.get(image_url)
            image_bytes = img_response.content
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            
            dino_emb = embed_image_dino(pil_image)
            clip_img_emb = embed_image_clip(pil_image)
            
            # Image → Image (DINOv2)
            results["img_to_img"] = milvus.search_dino(dino_emb, top_k=top_k * 2)
            
            # Image → Caption (CLIP)
            results["img_to_caption"] = milvus.search_clip_caption(clip_img_emb, top_k=top_k * 2)
        
        # Use enhanced description for text-based searches
        if enhanced_description:
            clip_txt_emb = embed_text_clip(enhanced_description)
            sentence_txt_emb = embed_text(enhanced_description)
            
            # Description → Image (CLIP)
            results["desc_to_img"] = milvus.search_clip_image(clip_txt_emb, top_k=top_k * 2)
            
            # Description → Caption (CLIP)
            results["desc_to_caption"] = milvus.search_clip_caption(clip_txt_emb, top_k=top_k * 2)
            
            # Description → Description (Sentence Embeddings)
            results["desc_to_desc"] = milvus.search_sentence_embedding(sentence_txt_emb, top_k=top_k * 2)
        
        # Merge and rank results
        ranked_results = merge_and_rank(results, SEARCH_WEIGHTS)
        
        # Filter results to only include items from the same collection and exclude taken items
        filtered_results = []
        for r in ranked_results:
            try:
                item_result = db.get_item(r["item_id"])
                if item_result.data:
                    item_status = item_result.data.get("status")
                    # Exclude items that are matched or claimed (taken)
                    if item_status in ["matched", "claimed"]:
                        continue
                    # If collection_id is specified, only include items from that collection
                    if inquiry_collection_id:
                        if item_result.data.get("collection_id") == inquiry_collection_id:
                            filtered_results.append(r)
                    else:
                        filtered_results.append(r)
            except:
                pass
        ranked_results = filtered_results[:top_k]
        
        # Update inquiry status to matched if we have results
        if ranked_results:
            db.update_inquiry_status(inquiry_id, "matched")
        
        # Clear existing matches for this inquiry before adding new ones
        db.delete_matches_for_inquiry(inquiry_id)
        
        # Store matches in database
        search_results = []
        for r in ranked_results:
            item_id = r["item_id"]
            scores = r["scores"]
            
            # Create new match record
            db.create_match(inquiry_id, item_id, {
                "img_to_img": scores.get("img_to_img"),
                "img_to_caption": scores.get("img_to_caption"),
                "desc_to_img": scores.get("desc_to_img"),
                "desc_to_caption": scores.get("desc_to_caption"),
                "desc_to_desc": scores.get("desc_to_desc"),
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
                    collection_id=item_data.get("collection_id"),
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
                    desc_to_desc=scores.get("desc_to_desc"),
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


# ============== Initialize Collections Endpoint ==============

@app.post("/admin/init-collections")
async def init_collections(drop_existing: bool = False):
    """Initialize Milvus collections (admin only)."""
    try:
        milvus.init_collections(drop_existing=drop_existing)
        return {"message": "Collections initialized", "stats": milvus.get_collection_stats()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/test", response_model=SearchResponse)
async def test_search(
    description: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    top_k: int = 10
):
    """
    Test endpoint to search without creating an inquiry.
    Accepts either description or image (or both).
    """
    if not description and not image:
        raise HTTPException(status_code=400, detail="Must provide either description or image")
    
    try:
        results = {}
        
        # If user provided an image
        if image:
            image_bytes = await image.read()
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
            sentence_txt_emb = embed_text(description)  # Sentence embedding for description-to-description
            
            # 3. Description → Image (CLIP)
            results["desc_to_img"] = milvus.search_clip_image(clip_txt_emb, top_k=top_k * 2)
            
            # 4. Description → Caption (CLIP)
            results["desc_to_caption"] = milvus.search_clip_caption(clip_txt_emb, top_k=top_k * 2)
            
            # 5. Description → Description (Sentence Embeddings) - only description-to-description
            results["desc_to_desc"] = milvus.search_sentence_embedding(sentence_txt_emb, top_k=top_k * 2)
        
        # Merge and rank results
        ranked_results = merge_and_rank(results, SEARCH_WEIGHTS)[:top_k]
        
        # Build search results (without storing in database)
        search_results = []
        for r in ranked_results:
            item_id = r["item_id"]
            scores = r["scores"]
            
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
                    collection_id=item_data.get("collection_id"),
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
                    desc_to_desc=scores.get("desc_to_desc"),
                    total=r["total"]
                ),
                item=item
            ))
        
        return SearchResponse(
            inquiry_id="test",  # Dummy ID for testing
            results=search_results,
            total=len(search_results)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
