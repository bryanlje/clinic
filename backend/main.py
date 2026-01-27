import os
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

import models, schemas, database

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
    existing = db.query(models.Patient).filter(models.Patient.id == patient.id).first()
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
    patient_id: Optional[str] = None,
    address: Optional[str] = None,
    visit_start: Optional[date] = None,
    visit_end: Optional[date] = None,
    dob_start: Optional[date] = None,
    dob_end: Optional[date] = None,

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
                models.Patient.id.ilike(f"%{query}%")
            )
        )

    # 3. ADVANCED SEARCH (Specific fields)
    if not query and not (name or patient_id or address or visit_start or visit_end or dob_start or dob_end):
        return List()

    if name:
        sql_query = sql_query.filter(models.Patient.name.ilike(f"%{name}%"))

    if patient_id:
        sql_query = sql_query.filter(models.Patient.id.ilike(f"%{patient_id}%"))

    if address:
        sql_query = sql_query.filter(models.Patient.address.ilike(f"%{address}%"))

    if visit_start:
        sql_query = sql_query.filter(models.Visit.date >= visit_start)

    if visit_end:
        sql_query = sql_query.filter(models.Visit.date <= visit_end)

    if dob_start:
        sql_query = sql_query.filter(models.Patient.date_of_birth >= dob_start)

    if dob_end:
        sql_query = sql_query.filter(models.Patient.date_of_birth <= dob_end)

    return sql_query.distinct().all()

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

# --- SERVE REACT FRONTEND (Production Mode) ---
# This checks if the 'dist' folder exists (created by 'npm run build')

frontend_dist = "../frontend/dist"

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