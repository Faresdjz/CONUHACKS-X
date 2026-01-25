from typing import List, Optional
from sentence_transformers import SentenceTransformer
import torch

_MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_model: Optional[SentenceTransformer] = None
_device: Optional[str] = None


def _load_model() -> SentenceTransformer:
    """Lazy load the sentence transformer model to avoid loading on import."""
    global _model, _device
    if _device is None:
        _device = "cuda" if torch.cuda.is_available() else "cpu"
    if _model is None:
        _model = SentenceTransformer(_MODEL_ID, device=_device)
    return _model


def embed_text(text: str) -> List[float]:
    """
    Generate sentence embeddings for text using paraphrase-multilingual-MiniLM-L12-v2.
    
    Args:
        text: Text string to embed
        
    Returns:
        List of 384 floats representing the text embedding (normalized)
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")

    model = _load_model()
    emb = model.encode(text, normalize_embeddings=True)
    return emb.astype("float32").tolist()