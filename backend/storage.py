import os
import shutil
from fastapi import UploadFile
from google.cloud import storage

# Config
ENVIRONMENT = os.getenv("ENVIRONMENT", "local") # "local" or "production"
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "")

async def save_file(file: UploadFile, visit_id: int) -> str:
    """
    Saves file to either local disk or GCS bucket based on environment.
    Returns the path/URL to be stored in the DB.
    """
    file_ext = file.filename.split('.')[-1]
    filename = f"visit_{visit_id}_{file.filename}"

    if ENVIRONMENT == "local":
        # Local Logic
        upload_dir = f"uploads/{visit_id}"
        os.makedirs(upload_dir, exist_ok=True)

        file_path = f"{upload_dir}/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return relative path for frontend to access via StaticFiles
        return f"/uploads/{visit_id}/{file.filename}"

    else:
        # GCP Cloud Storage Logic
        client = storage.Client()
        bucket = client.bucket(BUCKET_NAME)
        blob_path = f"visits/{visit_id}/{filename}"
        blob = bucket.blob(blob_path)

        # Upload
        blob.upload_from_file(file.file, content_type=file.content_type)

        # Use public URL or signed URL
        return blob.public_url
    
async def delete_file(file_path: str):
    """
    Deletes file from local disk or GCS bucket.
    """
    if ENVIRONMENT == "local":
        # Local: file_path is likely "/uploads/1/file.jpg"
        # We need to remove the leading "/" to find it on disk
        relative_path = file_path.lstrip("/") 
        if os.path.exists(relative_path):
            os.remove(relative_path)
    else:
        # GCP: file_path is a full public URL. 
        # We need to extract the blob name (everything after the bucket name)
        # Example URL: https://storage.googleapis.com/MY_BUCKET/visits/1/file.jpg
        try:
            client = storage.Client()
            bucket = client.bucket(BUCKET_NAME)
            
            # Extract blob name from URL
            # A simple way for GCS public URLs: split by bucket name
            blob_name = file_path.split(f"{BUCKET_NAME}/")[-1]
            
            blob = bucket.blob(blob_name)
            blob.delete()
        except Exception as e:
            print(f"Error deleting from GCS: {e}")