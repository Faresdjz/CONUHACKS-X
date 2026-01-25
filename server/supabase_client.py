import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client with service key for admin operations
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


# ============== Storage Operations ==============

def upload_image(bucket: str, file_path: str, file_bytes: bytes) -> str:
    """Upload image to Supabase Storage and return signed URL."""
    supabase.storage.from_(bucket).upload(file_path, file_bytes)
    signed = supabase.storage.from_(bucket).create_signed_url(file_path, 60 * 60 * 24 * 365)
    return signed.get("signedURL", supabase.storage.from_(bucket).get_public_url(file_path))


# ============== Items (Inventory) Operations ==============

def get_item(item_id: str):
    """Get an item by ID."""
    return supabase.table("items").select("*").eq("id", item_id).single().execute()


def get_items(limit: int = 100, offset: int = 0, status: Optional[str] = None):
    """Get all items with optional filtering."""
    query = supabase.table("items").select("*")
    if status:
        query = query.eq("status", status)
    return query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()


def update_item(item_id: str, updates: dict):
    """Update an item."""
    return supabase.table("items").update(updates).eq("id", item_id).execute()


def delete_item(item_id: str):
    """Delete an item."""
    return supabase.table("items").delete().eq("id", item_id).execute()


# ============== Inquiries Operations ==============

def create_inquiry(user_id: Optional[str], image_url: Optional[str], description: Optional[str], collection_id: Optional[str] = None):
    """Create a new inquiry."""
    data = {
        "user_id": user_id,
        "image_url": image_url,
        "description": description,
        "status": "submitted"
    }
    if collection_id:
        data["collection_id"] = collection_id
        
    return supabase.table("inquiries").insert(data).execute()


def get_inquiry(inquiry_id: str):
    """Get an inquiry by ID."""
    return supabase.table("inquiries").select("*").eq("id", inquiry_id).single().execute()


def get_inquiries(limit: int = 100, offset: int = 0, status: Optional[str] = None, user_id: Optional[str] = None):
    """Get all inquiries with optional filtering."""
    query = supabase.table("inquiries").select("*")
    if status:
        query = query.eq("status", status)
    if user_id:
        query = query.eq("user_id", user_id)
    return query.range(offset, offset + limit - 1).order("created_at", desc=True).execute()


def update_inquiry_status(inquiry_id: str, status: str):
    """Update inquiry status."""
    return supabase.table("inquiries").update({"status": status}).eq("id", inquiry_id).execute()


# ============== Matches Operations ==============

def create_match(inquiry_id: str, item_id: str, scores: dict):
    """Create a match record with all comparison scores."""
    return supabase.table("matches").insert({
        "inquiry_id": inquiry_id,
        "item_id": item_id,
        "img_to_img_score": scores.get("img_to_img"),
        "img_to_caption_score": scores.get("img_to_caption"),
        "desc_to_img_score": scores.get("desc_to_img"),
        "desc_to_caption_score": scores.get("desc_to_caption"),
        "desc_to_desc_score": scores.get("desc_to_desc"),
        "combined_score": scores.get("total"),
        "status": "pending"
    }).execute()


def get_matches_for_inquiry(inquiry_id: str):
    """Get all matches for an inquiry."""
    return supabase.table("matches").select("*, items(*)").eq("inquiry_id", inquiry_id).order("combined_score", desc=True).execute()


def get_pending_matches(limit: int = 100):
    """Get all pending matches for assistant review."""
    return supabase.table("matches").select("*, inquiries(*), items(*)").eq("status", "pending").order("combined_score", desc=True).range(0, limit - 1).execute()


def update_match_status(match_id: str, status: str, reviewed_by: Optional[str] = None):
    """Update match status (approve/reject)."""
    updates = {"status": status}
    if reviewed_by:
        updates["reviewed_by"] = reviewed_by
    return supabase.table("matches").update(updates).eq("id", match_id).execute()


def get_match(match_id: str):
    """Get a match by ID."""
    return supabase.table("matches").select("*, inquiries(*), items(*)").eq("id", match_id).single().execute()


# ============== Collections Operations ==============

def create_collection(name: str):
    """Create a new collection."""
    return supabase.table("collections").insert({
        "name": name
    }).execute()


def get_collection(collection_id: str):
    """Get a collection by ID with item count."""
    result = supabase.table("collections").select("*").eq("id", collection_id).single().execute()
    # Get item count
    items_result = supabase.table("items").select("id", count="exact").eq("collection_id", collection_id).execute()
    result.data["item_count"] = items_result.count if items_result.count else 0
    return result


def get_collections():
    """Get all collections with item counts."""
    result = supabase.table("collections").select("*").order("created_at", desc=True).execute()
    # Add item counts for each collection
    for c in result.data:
        items_result = supabase.table("items").select("id", count="exact").eq("collection_id", c["id"]).execute()
        c["item_count"] = items_result.count if items_result.count else 0
    return result


def delete_collection(collection_id: str):
    """Delete a collection (unlinks items, doesn't delete them)."""
    # First unlink all items from this collection
    supabase.table("items").update({"collection_id": None}).eq("collection_id", collection_id).execute()
    # Then delete the collection
    return supabase.table("collections").delete().eq("id", collection_id).execute()


def get_items_by_collection(collection_id: str):
    """Get all items in a collection."""
    return supabase.table("items").select("*").eq("collection_id", collection_id).order("created_at", desc=True).execute()


def get_collection_by_name(name: str):
    """Get a collection by name (case-insensitive)."""
    # Using ilike for case-insensitive matching
    return supabase.table("collections").select("*").ilike("name", name).limit(1).execute()
