import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
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
def search_patients(name: str, db: Session = Depends(database.get_db)):
    name_results = db.query(models.Patient).filter(
        models.Patient.name.ilike(f"%{name}%")
    ).all()
    id_results = db.query(models.Patient).filter(
        models.Patient.id.ilike(f"%{name}%")
    ).all()
    return name_results + id_results

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