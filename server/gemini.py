import os

from google import genai
from google.genai import types
from dotenv import load_dotenv

from models import CaptionResponse, OCRResponse, VerificationQuestionsOutput, FollowUpQuestionsOutput

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
MODEL = "gemini-2.0-flash"


def generate_caption(image: bytes, skip_on_error: bool = True) -> str:
    """Generate a detailed caption for a lost item image."""
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                "Analyze this lost item image and provide structured details for matching. Be specific and objective.",
                types.Part.from_bytes(data=image, mime_type="image/jpeg")
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CaptionResponse,
            ),
        )
        return CaptionResponse.model_validate_json(response.text).format()
    except Exception as e:
        if skip_on_error:
            return f"[Caption skipped - {str(e)[:50]}]"
        raise


def extract_text_from_image(image: bytes, skip_on_error: bool = True) -> str:
    """Extract visible text from an image (OCR)."""
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                "Extract ALL visible text from this image: serial numbers, model numbers, brand names, labels, stickers, writing. If no text, set has_text to false.",
                types.Part.from_bytes(data=image, mime_type="image/jpeg")
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=OCRResponse,
            ),
        )
        result = OCRResponse.model_validate_json(response.text)
        return "\n".join(result.extracted_text) if result.has_text and result.extracted_text else "No text found"
    except Exception as e:
        if skip_on_error:
            return "[OCR skipped - API error]"
        raise


DEFAULT_QUESTIONS = [
    "What is the approximate size or dimensions of the item?",
    "Are there any scratches, marks, or wear patterns you can describe?",
    "What was in or attached to the item when you lost it?",
    "Can you describe any stickers, labels, or unique identifiers?",
    "What color is the item, including any secondary colors or patterns?"
]


def generate_verification_questions(caption: str, extracted_text: str, skip_on_error: bool = True) -> list[str]:
    """Generate verification questions for fraud prevention."""
    caption = caption if caption and not caption.startswith("[") else "No description available"
    extracted_text = extracted_text if extracted_text and not extracted_text.startswith("[") else "No text found"
    
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=f"""
                Generate 3-5 verification questions that only the true owner could answer.
                Focus on: serial numbers, unique marks, contents, accessories, hidden details.
                Item: {caption}
                Text found: {extracted_text}
            """,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=VerificationQuestionsOutput,
            ),
        )
        result = VerificationQuestionsOutput.model_validate_json(response.text)
        return result.questions[:5] if result.questions else DEFAULT_QUESTIONS
    except Exception:
        if skip_on_error:
            return DEFAULT_QUESTIONS
        raise


DEFAULT_FOLLOWUP_QUESTIONS = [
    "Can you describe any unique markings, scratches, or wear on the item?",
    "What was the approximate location where you last had the item?",
    "Are there any stickers, engravings, or personal modifications on it?",
    "What color is the item, including any secondary colors?",
    "Can you describe what was inside or attached to the item?"
]


def generate_follow_up_questions(description: str | None, image_url: str | None, skip_on_error: bool = True) -> list[str]:
    """Generate follow-up questions based on the inquiry description and/or image."""
    if not description and not image_url:
        return DEFAULT_FOLLOWUP_QUESTIONS
    
    description = description if description else "No description provided"
    
    try:
        contents = [
            f"""
            A user has submitted a lost item inquiry with the following description:
            "{description}"
            
            Generate 3-5 follow-up questions to help identify and verify the item.
            Questions should:
            - Ask for specific details that would help identify the exact item
            - Be clear and easy to answer
            - Focus on: brand, size, distinguishing marks, contents, accessories, location details
            - IF there is personal info, YOU HAVE TO ASK QUESTIONS ABOUT IT (name, phone number, email, address, etc.)
            """
        ]
        
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=FollowUpQuestionsOutput,
            ),
        )
        result = FollowUpQuestionsOutput.model_validate_json(response.text)
        return result.questions[:5] if result.questions else DEFAULT_FOLLOWUP_QUESTIONS
    except Exception as e:
        if skip_on_error:
            print(f"[Follow-up generation error: {str(e)[:50]}]")
            return DEFAULT_FOLLOWUP_QUESTIONS
        raise
