import io
from typing import Union, List

import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoImageProcessor, AutoModel

_MODEL_ID = "facebook/dinov2-large"
_processor = None
_model = None
_device = None

def _load_model():
    global _processor, _model, _device
    if _device is None:
        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if _processor is None:
        _processor = AutoImageProcessor.from_pretrained(_MODEL_ID)
    if _model is None:
        _model = AutoModel.from_pretrained(_MODEL_ID).to(_device).eval()
    return _processor, _model, _device

def embed_image_dino(image: Union[Image.Image, bytes]) -> List[float]:
    processor, model, device = _load_model()

    if isinstance(image, bytes):
        image = Image.open(io.BytesIO(image)).convert("RGB")
    elif isinstance(image, Image.Image):
        image = image.convert("RGB")
    else:
        raise TypeError("image must be PIL.Image.Image or bytes")

    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        out = model(**inputs)
        # mean pooling sur patch tokens (sans CLS)
        tokens = out.last_hidden_state[:, 1:, :]      
        v = tokens.mean(dim=1)                       
        v = F.normalize(v, p=2, dim=1)                # important pour la similarité cosinus (des images peuvent avoir des normes différentes)
    return v.squeeze(0).cpu().tolist()
