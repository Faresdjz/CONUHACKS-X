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
SENTENCE_EMBEDDING_COLLECTION = "sentence_embedding_collection"

# Embedding dimensions
DINO_DIM = 1024
CLIP_DIM = 768
SENTENCE_EMBEDDING_DIM = 384  # paraphrase-multilingual-MiniLM-L12-v2

# Search weights for comparison
SEARCH_WEIGHTS = {
    "img_to_img": 0.30,       # Visual match is most important
    "img_to_caption": 0.20,
    "desc_to_img": 0.15,
    "desc_to_caption": 0.15,
    "desc_to_desc": 0.20      # Description-to-description using sentence embeddings
}
