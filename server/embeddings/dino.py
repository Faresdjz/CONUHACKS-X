import torch
from transformers import AutoImageProcessor, AutoModel
from PIL import Image
from typing import Union
import io

# Load DINOv2 model and processor
# Using dinov2-large for 1024-dimensional embeddings
_processor = None
_model = None


def _load_model():
    """Lazy load the DINOv2 model to avoid loading on import."""
    global _processor, _model
    if _processor is None:
        _processor = AutoImageProcessor.from_pretrained("facebook/dinov2-large")
    if _model is None:
        _model = AutoModel.from_pretrained("facebook/dinov2-large")
        _model.eval()
        # Move to GPU if available
        if torch.cuda.is_available():
            _model = _model.cuda()
    return _processor, _model


def embed_image_dino(image: Union[Image.Image, bytes]) -> list[float]:
    """
    Generate DINOv2 embedding for an image.
    
    Args:
        image: PIL Image or bytes of the image
        
    Returns:
        List of 1024 floats representing the image embedding
    """
    processor, model = _load_model()
    
    # Convert bytes to PIL Image if needed
    if isinstance(image, bytes):
        image = Image.open(io.BytesIO(image)).convert("RGB")
    elif isinstance(image, Image.Image):
        image = image.convert("RGB")
    
    # Process image
    inputs = processor(images=image, return_tensors="pt")
    
    # Move to GPU if available
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
    
    # Get embeddings
    with torch.no_grad():
        outputs = model(**inputs)
        # Use CLS token embedding (first token of last hidden state)
        embeddings = outputs.last_hidden_state[:, 0, :]
    
    # Convert to list and return
    return embeddings[0].cpu().numpy().tolist()
