import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
from typing import Union
import io

# Load CLIP model and processor
# Using clip-vit-large-patch14 for 768-dimensional embeddings
_processor = None
_model = None


def _load_model():
    """Lazy load the CLIP model to avoid loading on import."""
    global _processor, _model
    if _processor is None:
        _processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
    if _model is None:
        _model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
        _model.eval()
        # Move to GPU if available
        if torch.cuda.is_available():
            _model = _model.cuda()
    return _processor, _model


def embed_image_clip(image: Union[Image.Image, bytes]) -> list[float]:
    """
    Generate CLIP embedding for an image.
    
    Args:
        image: PIL Image or bytes of the image
        
    Returns:
        List of 768 floats representing the image embedding
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
    
    with torch.no_grad():
        output = model.get_image_features(**inputs)
        embeddings = output if isinstance(output, torch.Tensor) else output.pooler_output

    embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
    return embeddings[0].cpu().numpy().tolist()


def embed_text_clip(text: str) -> list[float]:
    """
    Generate CLIP embedding for text.
    
    Args:
        text: Text string to embed
        
    Returns:
        List of 768 floats representing the text embedding
    """
    processor, model = _load_model()
    
    # Process text
    inputs = processor(text=[text], return_tensors="pt", padding=True, truncation=True, max_length=77)
    
    # Move to GPU if available
    if torch.cuda.is_available():
        inputs = {k: v.cuda() for k, v in inputs.items()}
    
    with torch.no_grad():
        output = model.get_text_features(**inputs)
        embeddings = output if isinstance(output, torch.Tensor) else output.pooler_output

    embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
    return embeddings[0].cpu().numpy().tolist()


