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

def create_inquiry(user_id: Optional[str], image_url: Optional[str], description: Optional[str]):
    """Create a new inquiry."""
    return supabase.table("inquiries").insert({
        "user_id": user_id,
        "image_url": image_url,
        "description": description,
        "status": "submitted"
    }).execute()


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
    """Create a match record with all 4 comparison scores."""
    return supabase.table("matches").insert({
        "inquiry_id": inquiry_id,
        "item_id": item_id,
        "img_to_img_score": scores.get("img_to_img"),
        "img_to_caption_score": scores.get("img_to_caption"),
        "desc_to_img_score": scores.get("desc_to_img"),
        "desc_to_caption_score": scores.get("desc_to_caption"),
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
