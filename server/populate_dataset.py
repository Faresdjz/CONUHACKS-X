#!/usr/bin/env python3
"""
Script to populate the database by iterating through the dataset folder
and posting images to the API endpoint.
"""

import os
import sys
import requests
from pathlib import Path
from typing import List, Tuple
import time

# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
DATASET_FOLDER = Path(__file__).parent / "dataset"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}


def get_image_files(dataset_folder: Path) -> List[Tuple[Path, str]]:
    """
    Get all image files from the dataset folder.
    Returns list of tuples: (file_path, category)
    """
    image_files = []
    
    if not dataset_folder.exists():
        print(f"Error: Dataset folder not found at {dataset_folder}")
        return image_files
    
    # Iterate through subdirectories
    for category_folder in dataset_folder.iterdir():
        if not category_folder.is_dir():
            continue
        
        category = category_folder.name
        print(f"Scanning category: {category}")
        
        # Get all image files in this category
        for image_file in category_folder.iterdir():
            if image_file.is_file() and image_file.suffix in SUPPORTED_EXTENSIONS:
                image_files.append((image_file, category))
    
    return image_files


def upload_image(image_path: Path, category: str, api_url: str) -> bool:
    """
    Upload a single image to the API.
    
    Args:
        image_path: Path to the image file
        category: Category name (folder name)
        api_url: Base API URL
        
    Returns:
        True if successful, False otherwise
    """
    endpoint = f"{api_url}/inventory/items"
    
    try:
        with open(image_path, "rb") as f:
            files = {
                "image": (image_path.name, f, "image/jpeg" if image_path.suffix.lower() in [".jpg", ".jpeg"] else "image/png")
            }
            data = {
                "category": category
            }
            
            response = requests.post(endpoint, files=files, data=data, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                print(f"  ✓ {image_path.name} -> Item ID: {result.get('id', 'N/A')}")
                return True
            else:
                print(f"  ✗ {image_path.name} -> Error {response.status_code}: {response.text}")
                return False
                
    except requests.exceptions.RequestException as e:
        print(f"  ✗ {image_path.name} -> Request error: {str(e)}")
        return False
    except Exception as e:
        print(f"  ✗ {image_path.name} -> Error: {str(e)}")
        return False


def main():
    """Main function to populate the database."""
    print("=" * 60)
    print("Dataset Population Script")
    print("=" * 60)
    print(f"API URL: {API_BASE_URL}")
    print(f"Dataset folder: {DATASET_FOLDER}")
    print()
    
    # Check if API is accessible
    try:
        health_response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print(f"Warning: API health check failed (status {health_response.status_code})")
    except requests.exceptions.RequestException as e:
        print(f"Error: Cannot connect to API at {API_BASE_URL}")
        print(f"  {str(e)}")
        print("\nMake sure the API server is running!")
        sys.exit(1)
    
    # Get all image files
    image_files = get_image_files(DATASET_FOLDER)
    
    if not image_files:
        print("No image files found in the dataset folder!")
        sys.exit(1)
    
    print(f"\nFound {len(image_files)} image files to process")
    print("-" * 60)
    
    # Process each image
    successful = 0
    failed = 0
    
    for idx, (image_path, category) in enumerate(image_files, 1):
        print(f"[{idx}/{len(image_files)}] Processing {category}/{image_path.name}...", end=" ")
        
        if upload_image(image_path, category, API_BASE_URL):
            successful += 1
        else:
            failed += 1
        
        # Small delay to avoid overwhelming the API
        time.sleep(0.5)
    
    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total files: {len(image_files)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    main()
