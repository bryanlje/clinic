import os
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import or_, func, cast, Integer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

import models, schemas, database, storage

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# --- CORS (For Dev Mode) ---
# Allows Vite dev server (port 5173) to talk to Python (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API ROUTES ---

@app.post("/api/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    # Check if ID exists
    existing = db.query(models.Patient).filter(models.Patient.display_id == patient.display_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient ID already exists")
    
    db_patient = models.Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/api/patients/search/", response_model=List[schemas.Patient])
def search_patients(
    # Basic seach param
    query: Optional[str] = None,

    # Advanced specific params
    name: Optional[str] = None,
    display_id: Optional[str] = None,
    address: Optional[str] = None,
    date_registered_start: Optional[date] = None,
    date_registered_end: Optional[date] = None,
    visit_start: Optional[date] = None,
    visit_end: Optional[date] = None,
    dob_start: Optional[date] = None,
    dob_end: Optional[date] = None,

    limit: int = 25,

    db: Session = Depends(database.get_db)
):
    sql_query = db.query(models.Patient)

    # 1. Join Visits only if filtering by visit dates
    if visit_start or visit_end:
        sql_query = sql_query.join(models.Visit)

    # 2. BASIC SEARCH (Name OR ID)
    if query and not name:
        sql_query = sql_query.filter(
            or_(
                models.Patient.name.ilike(f"%{query}%"),
                models.Patient.display_id.ilike(f"%{query}%")
            )
        )

    # 3. ADVANCED SEARCH (Specific fields)
    if not query and not (name or display_id or address or date_registered_start or date_registered_end or visit_start or visit_end or dob_start or dob_end):
        return []

    if name:
        sql_query = sql_query.filter(models.Patient.name.ilike(f"%{name}%"))

    if display_id:
        sql_query = sql_query.filter(models.Patient.display_id.ilike(f"%{display_id}%"))

    if address:
        sql_query = sql_query.filter(models.Patient.address.ilike(f"%{address}%"))

    if date_registered_start:
        sql_query = sql_query.filter(models.Patient.date_registered >= date_registered_start)

    if date_registered_end:
        sql_query = sql_query.filter(models.Patient.date_registered <= date_registered_end)

    if visit_start:
        sql_query = sql_query.filter(models.Visit.date >= visit_start)

    if visit_end:
        sql_query = sql_query.filter(models.Visit.date <= visit_end)

    if dob_start:
        sql_query = sql_query.filter(models.Patient.date_of_birth >= dob_start)

    if dob_end:
        sql_query = sql_query.filter(models.Patient.date_of_birth <= dob_end)

    return sql_query.distinct().order_by(models.Patient.name).limit(limit).all()

@app.get("/api/patients/{patient_id}", response_model=schemas.Patient)
def get_patient(patient_id: str, db: Session = Depends(database.get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.put("/api/patients/{patient_id}", response_model=schemas.Patient)
def update_patient(patient_id: str, patient_update: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    db_patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    for key, value in patient_update.dict().items():
        setattr(db_patient, key, value)
    
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: str, db: Session = Depends(database.get_db)):
    # 1. Find the patient
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. CLEANUP: Delete physical files associated with this patient
    try:
        for visit in patient.visits:
            for attachment in visit.attachments:
                # Use the storage helper we created earlier to delete from Disk or GCP
                await storage.delete_file(attachment.file_path)
    except Exception as e:
        print(f"Warning: Error cleaning up files for patient {patient_id}: {e}")
        # Continue execution - still delete the DB record even if file deletion fails.

    # 3. Delete the Patient Record
    db.delete(patient)
    db.commit()

    return {"status": "success", "message": f"Patient {patient.name} and all associated records deleted."}

@app.get("/api/patients/next-id/{prefix}")
def get_next_id(prefix: str, db: Session = Depends(database.get_db)):
    # Calculate length to strip the prefix (e.g., "P" is len 1, so start at index 2)
    # Note: SQL substring is 1-indexed usually, but let's be safe with logic
    prefix_len = len(prefix) + 1 
    
    # SQL: SELECT MAX(CAST(SUBSTRING(id FROM x) AS INTEGER)) FROM patients WHERE id LIKE 'X%'
    max_val = db.query(
        func.max(
            cast(
                func.substring(models.Patient.display_id, prefix_len), 
                Integer
            )
        )
    ).filter(
        models.Patient.display_id.ilike(f"{prefix}%")
    ).scalar() # scalar() gets the single value, not a list

    next_num = (max_val or 0) + 1
    
    return {
        "last_id": f"{prefix.upper()}{max_val}" if max_val else None,
        "next_suggestion": f"{prefix.upper()}{next_num}"
    }

@app.post("/api/visits/", response_model=schemas.Visit)
def create_visit(visit: schemas.VisitCreate, db: Session = Depends(database.get_db)):
    db_visit = models.Visit(**visit.dict())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit

@app.put("/api/visits/{visit_id}")
def update_visit(visit_id: int, visit_update: schemas.VisitUpdate, db: Session = Depends(database.get_db)):
    # 1. Find the visit in the database
    db_visit = db.query(models.Visit).filter(models.Visit.visit_id == visit_id).first()
    
    # 2. If not found, throw error
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    # 3. Update the fields
    db_visit.date = visit_update.date
    db_visit.time = visit_update.time
    db_visit.weight = visit_update.weight
    db_visit.total_charge = visit_update.total_charge
    db_visit.doctor_notes = visit_update.doctor_notes

    db.commit()
    db.refresh(db_visit)
    
    return db_visit

@app.delete("/api/visits/{visit_id}")
async def delete_visit(visit_id: int, db: Session = Depends(database.get_db)):
    # 1. Find the visit
    db_visit = db.query(models.Visit).filter(models.Visit.visit_id == visit_id).first()
    
    if not db_visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    # 2. Delete physical files (Local or GCP)
    if db_visit.attachments:
        for attachment in db_visit.attachments:
            try:
                await storage.delete_file(attachment.file_path)
            except Exception as e:
                print(f"Error deleting file {attachment.file_path}: {e}")

    # 4. Delete and commit
    db.delete(db_visit)
    db.commit()
    
    return {"detail": "Visit and attachments deleted successfully"}

# Mount uploads folder for local dev
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/api/visits/{visit_id}/upload")
async def upload_attachment(
    visit_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(database.get_db)
):
    # 1. Save file physically (Local or Cloud)
    stored_path = await storage.save_file(file, visit_id)

    # 2. Save metadata to DB
    attachment = models.VisitAttachment(
        visit_id=visit_id,
        file_path=stored_path,
        file_type=file.content_type,
        original_filename=file.filename
    )
    db.add(attachment)
    db.commit()

    return {"status": "success", "path": stored_path}

@app.delete("/api/attachments/{attachment_id}")
async def delete_visit_attachment(
    attachment_id: int, 
    db: Session = Depends(database.get_db)
):
    # 1. Find the attachment record
    attachment = db.query(models.VisitAttachment).filter(models.VisitAttachment.id == attachment_id).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # 2. Delete the physical file (using our storage helper)
    await storage.delete_file(attachment.file_path)

    # 3. Delete the DB record
    db.delete(attachment)
    db.commit()
    
    return {"status": "deleted"}

# --- SERVE REACT FRONTEND (Production Mode) ---
# This checks if the 'dist' folder exists (created by 'npm run build')

# Default to local dev path, but allow override via ENV
frontend_dist = os.getenv("FRONTEND_DIST_PATH", "../frontend/dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=f"{frontend_dist}/assets"), name="assets")

    # Catch-all route for React Router (SPA)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # If the file exists in dist, serve it (e.g., favicon.ico)
        if os.path.exists(f"{frontend_dist}/{full_path}") and full_path != "":
             return FileResponse(f"{frontend_dist}/{full_path}")
        # Otherwise, serve index.html so React can handle the routing
        return FileResponse(f"{frontend_dist}/index.html")
else:
    print("Warning: Frontend 'dist' folder not found. Running API only mode.")