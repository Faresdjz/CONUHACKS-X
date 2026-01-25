from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============== Enums ==============

class ItemStatus(str, Enum):
    AVAILABLE = "available"
    MATCHED = "matched"
    CLAIMED = "claimed"


class InquiryStatus(str, Enum):
    SUBMITTED = "submitted"
    REVIEWED = "reviewed"
    FOLLOW_UP = "follow_up"
    RESOLVED = "resolved"
    DENIED = "denied"


class MatchStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# ============== Item Models ==============

class ItemResponse(BaseModel):
    """Response model for an inventory item."""
    id: str
    image_url: str
    caption: Optional[str] = None
    extracted_text: Optional[str] = None
    category: Optional[str] = None
    status: ItemStatus = ItemStatus.AVAILABLE
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ItemUpdate(BaseModel):
    """Request model for updating an inventory item."""
    category: Optional[str] = None
    status: Optional[ItemStatus] = None


class ItemListResponse(BaseModel):
    """Response model for listing items."""
    items: List[ItemResponse]
    total: int


# ============== Inquiry Models ==============

class InquiryResponse(BaseModel):
    """Response model for an inquiry."""
    id: str
    user_id: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    status: InquiryStatus = InquiryStatus.SUBMITTED
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InquiryListResponse(BaseModel):
    """Response model for listing inquiries."""
    inquiries: List[InquiryResponse]
    total: int


# ============== Match Models ==============

class MatchScores(BaseModel):
    """Individual scores from 4-way comparison."""
    img_to_img: Optional[float] = Field(None, description="DINOv2: user image vs item image")
    img_to_caption: Optional[float] = Field(None, description="CLIP: user image vs item caption")
    desc_to_img: Optional[float] = Field(None, description="CLIP: user description vs item image")
    desc_to_caption: Optional[float] = Field(None, description="CLIP: user description vs item caption")
    total: float = Field(..., description="Combined weighted score")


class MatchResponse(BaseModel):
    """Response model for a match."""
    id: str
    inquiry_id: str
    item_id: str
    img_to_img_score: Optional[float] = None
    img_to_caption_score: Optional[float] = None
    desc_to_img_score: Optional[float] = None
    desc_to_caption_score: Optional[float] = None
    combined_score: float
    status: MatchStatus = MatchStatus.PENDING
    reviewed_by: Optional[str] = None
    created_at: datetime
    
    # Nested item data (when joined)
    item: Optional[ItemResponse] = None

    class Config:
        from_attributes = True


class MatchListResponse(BaseModel):
    """Response model for listing matches."""
    matches: List[MatchResponse]
    total: int


# ============== Search Models ==============

class SearchResult(BaseModel):
    """Single search result."""
    item_id: str
    scores: MatchScores
    item: Optional[ItemResponse] = None


class SearchResponse(BaseModel):
    """Response model for search results."""
    inquiry_id: str
    results: List[SearchResult]
    total: int


# ============== Verification Models ==============

class VerificationQuestionsResponse(BaseModel):
    """Response with verification questions."""
    questions: List[str]
    item_id: str


# ============== Gemini Structured Output Models ==============

class CaptionResponse(BaseModel):
    """Structured response from Gemini for image captioning."""
    description: str = Field(..., description="Detailed item description for matching")
    colors: List[str] = Field(default_factory=list, description="Colors visible in the item")
    category: str = Field(..., description="Item category (electronics, clothing, accessories, bags, etc.)")
    condition: str = Field(..., description="Item condition (new, used, worn, damaged)")
    brand: Optional[str] = Field(None, description="Brand if visible")
    distinguishing_features: List[str] = Field(default_factory=list, description="Unique marks, patterns, stickers")

    def format(self) -> str:
        """Format caption as readable string."""
        parts = [self.description]
        if self.colors:
            parts.append(f"Colors: {', '.join(self.colors)}")
        if self.brand:
            parts.append(f"Brand: {self.brand}")
        parts.append(f"Category: {self.category}")
        parts.append(f"Condition: {self.condition}")
        if self.distinguishing_features:
            parts.append(f"Features: {', '.join(self.distinguishing_features)}")
        return " | ".join(parts)


class OCRResponse(BaseModel):
    """Structured response from Gemini for text extraction."""
    extracted_text: List[str] = Field(default_factory=list, description="All text found in image")
    has_text: bool = Field(default=False, description="Whether any text was found")


class VerificationQuestionsOutput(BaseModel):
    """Structured response from Gemini for verification questions."""
    questions: List[str] = Field(..., description="Verification questions only true owner can answer")


# ============== Health/Stats Models ==============

class CollectionStats(BaseModel):
    """Statistics for a Milvus collection."""
    exists: bool
    num_entities: Optional[int] = None


class SystemStats(BaseModel):
    """System statistics."""
    dino_collection: CollectionStats
    clip_image_collection: CollectionStats
    clip_caption_collection: CollectionStats
    total_items: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    milvus_connected: bool
    supabase_connected: bool
