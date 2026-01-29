#!/bin/bash

# This is where the PDF/Image files actually live on the laptop
LOCAL_ATTACHMENTS_DIR="/mnt/c/Users/User/Documents/BRYAN/CLINIC/attachment_uploads"

# This is where to save the temporary database dump file
LOCAL_DB_BACKUP_DIR="/mnt/c/Users/User/Documents/BRYAN/CLINIC/database_backups"

# Google Cloud Storage Bucket Name
GCS_BUCKET="gs://leong-clinic-backups"

# Create the local backup folder if it doesn't exist yet (Prevents errors)
mkdir -p "$LOCAL_DB_BACKUP_DIR"

# --- STEP 1: DATABASE BACKUP ---
echo "Starting Database Backup..."
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILE="$LOCAL_DB_BACKUP_DIR/backup_$TIMESTAMP.sql"

# Run pg_dump inside the docker container, stream output to laptop file
docker exec -t clinic-db pg_dump -U postgres postgres > "$BACKUP_FILE"

# Upload to Google Cloud
gsutil cp "$BACKUP_FILE" "$GCS_BUCKET/database_backups/"

# Optional: Clean up (Delete) the local SQL file after upload to save space?
# rm "$BACKUP_FILE" 

# --- STEP 2: ATTACHMENTS SYNC ---
echo "Starting Attachments Sync..."

# Sync the ACTUAL Windows data folder to the cloud
gsutil -m rsync -r "$LOCAL_ATTACHMENTS_DIR" "$GCS_BUCKET/attachment_backups/"

echo "✅ Backup Complete!"