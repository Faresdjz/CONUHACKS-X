from pymilvus import MilvusClient, DataType
from dotenv import load_dotenv
from config import (
    MILVUS_URI, MILVUS_TOKEN,
    DINO_COLLECTION, CLIP_IMAGE_COLLECTION, CLIP_CAPTION_COLLECTION,
    DINO_DIM, CLIP_DIM
)

load_dotenv()

# Initialize Milvus client
client = MilvusClient(uri=MILVUS_URI, token=MILVUS_TOKEN)


def init_collections(drop_existing: bool = False):
    """
    Initialize all three collections for the triple-collection architecture.
    
    Args:
        drop_existing: If True, drop existing collections before creating
    """
    collections = [
        (DINO_COLLECTION, DINO_DIM),           # DINOv2 image embeddings
        (CLIP_IMAGE_COLLECTION, CLIP_DIM),     # CLIP image embeddings
        (CLIP_CAPTION_COLLECTION, CLIP_DIM),   # CLIP caption embeddings
    ]
    
    for collection_name, dimension in collections:
        if drop_existing and client.has_collection(collection_name):
            client.drop_collection(collection_name)
            print(f"Dropped existing collection: {collection_name}")
        
        if not client.has_collection(collection_name):
            client.create_collection(
                collection_name=collection_name,
                dimension=dimension,
                metric_type="COSINE",  # Cosine similarity for normalized embeddings
                id_type=DataType.VARCHAR,
                max_length=64,
            )
            print(f"Created collection: {collection_name} (dim={dimension})")
        else:
            print(f"Collection already exists: {collection_name}")


def insert_item_embeddings(
    item_id: str,
    dino_embedding: list[float],
    clip_image_embedding: list[float],
    clip_caption_embedding: list[float]
) -> None:
    """
    Insert embeddings for a new item into all three collections.
    
    Args:
        item_id: UUID of the item (shared across collections)
        dino_embedding: DINOv2 image embedding (1024 dim)
        clip_image_embedding: CLIP image embedding (768 dim)
        clip_caption_embedding: CLIP caption embedding (768 dim)
    """
    # Insert into dino_collection
    client.insert(
        collection_name=DINO_COLLECTION,
        data=[{"id": item_id, "vector": dino_embedding}]
    )
    
    # Insert into clip_image_collection
    client.insert(
        collection_name=CLIP_IMAGE_COLLECTION,
        data=[{"id": item_id, "vector": clip_image_embedding}]
    )
    
    # Insert into clip_caption_collection
    client.insert(
        collection_name=CLIP_CAPTION_COLLECTION,
        data=[{"id": item_id, "vector": clip_caption_embedding}]
    )


def delete_item_embeddings(item_id: str) -> None:
    """
    Delete embeddings for an item from all three collections.
    
    Args:
        item_id: UUID of the item to delete
    """
    for collection_name in [DINO_COLLECTION, CLIP_IMAGE_COLLECTION, CLIP_CAPTION_COLLECTION]:
        client.delete(
            collection_name=collection_name,
            filter=f'id == "{item_id}"'
        )


def search_dino(query_embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Search dino_collection for image-to-image matching.
    
    Args:
        query_embedding: DINOv2 embedding of query image
        top_k: Number of results to return
        
    Returns:
        List of matches with id and distance
    """
    results = client.search(
        collection_name=DINO_COLLECTION,
        data=[query_embedding],
        limit=top_k,
        output_fields=["id"]
    )
    return results[0] if results else []


def search_clip_image(query_embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Search clip_image_collection for description-to-image matching.
    
    Args:
        query_embedding: CLIP text embedding of query description
        top_k: Number of results to return
        
    Returns:
        List of matches with id and distance
    """
    results = client.search(
        collection_name=CLIP_IMAGE_COLLECTION,
        data=[query_embedding],
        limit=top_k,
        output_fields=["id"]
    )
    return results[0] if results else []


def search_clip_caption(query_embedding: list[float], top_k: int = 10) -> list[dict]:
    """
    Search clip_caption_collection for image-to-caption or description-to-caption matching.
    
    Args:
        query_embedding: CLIP embedding (image or text) of query
        top_k: Number of results to return
        
    Returns:
        List of matches with id and distance
    """
    results = client.search(
        collection_name=CLIP_CAPTION_COLLECTION,
        data=[query_embedding],
        limit=top_k,
        output_fields=["id"]
    )
    return results[0] if results else []


def get_collection_stats():
    """Get statistics for all collections."""
    stats = {}
    for collection_name in [DINO_COLLECTION, CLIP_IMAGE_COLLECTION, CLIP_CAPTION_COLLECTION]:
        if client.has_collection(collection_name):
            # Get collection info
            stats[collection_name] = {
                "exists": True,
                "num_entities": client.get_collection_stats(collection_name).get("row_count", 0)
            }
        else:
            stats[collection_name] = {"exists": False}
    return stats


# Initialize collections on module load
if __name__ == "__main__":
    init_collections(drop_existing=False)
    print("Collections initialized!")
    print(get_collection_stats())
