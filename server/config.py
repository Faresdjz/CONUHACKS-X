import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Milvus Configuration
MILVUS_URI = os.getenv("ADMIN_MILVUS_URI")
MILVUS_TOKEN = os.getenv("ADMIN_MILVUS_TOKEN")

# Collection names
DINO_COLLECTION = "dino_collection"
CLIP_IMAGE_COLLECTION = "clip_image_collection"
CLIP_CAPTION_COLLECTION = "clip_caption_collection"

# Embedding dimensions
DINO_DIM = 1024
CLIP_DIM = 768

# Search weights for 4-way comparison
SEARCH_WEIGHTS = {
    "img_to_img": 0.35,       # Visual match is most important
    "img_to_caption": 0.25,
    "desc_to_img": 0.20,
    "desc_to_caption": 0.20
}
