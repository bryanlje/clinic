import os, csv, io
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import or_, func, cast, Integer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

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
    # 1. Separate dispensations from the main visit data
    visit_data = visit.dict()
    dispensations_data = visit_data.pop("dispensations", [])

    # 2. Create the Visit Record
    db_visit = models.Visit(**visit_data)
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)

    # 3. Create Dispensation Records linked to this Visit
    for item in dispensations_data:
        db_dispensation = models.DispensationItem(
            visit_id=db_visit.visit_id,
            medicine_name=item['medicine_name'],
            instructions=item.get('instructions'),
            quantity=item['quantity'],
            is_dispensed=item.get('is_dispensed', True)
        )
        db.add(db_dispensation)
    
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

    # 3. Update basic fields
    db_visit.date = visit_update.date
    db_visit.time = visit_update.time
    db_visit.weight = visit_update.weight
    db_visit.total_charge = visit_update.total_charge
    db_visit.doctor_notes = visit_update.doctor_notes

    # 3. Handle Dispensations (Full Replace Strategy)
    # A. Delete existing items for this visit
    db.query(models.DispensationItem).filter(models.DispensationItem.visit_id == visit_id).delete()
    # B. Add the new list
    if visit_update.dispensations:
        for item in visit_update.dispensations:
            new_item = models.DispensationItem(
                visit_id=visit_id,
                medicine_name=item.medicine_name,
                instructions=item.instructions,
                quantity=item.quantity,
                is_dispensed=item.is_dispensed
            )
            db.add(new_item)

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

@app.get("/api/reports/dispensations/export-csv")
def export_dispensations_csv(
    start_date: date,
    end_date: date,
    db: Session = Depends(database.get_db)
):
    # 1. Query: Join Visits -> Patients -> Dispensations
    # We filter by visit date and ensure there are dispensations
    query = (
        db.query(models.Visit)
        .join(models.Patient)
        .join(models.DispensationItem)
        .filter(models.Visit.date >= start_date)
        .filter(models.Visit.date <= end_date)
        .order_by(models.Visit.date, models.Visit.time)
    )
    
    visits = query.all()

    # 2. Prepare CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header Row
    writer.writerow([
        "Date", 
        "Time", 
        "Patient Name", 
        "Patient Address", 
        "Medicine", 
        "Instructions", 
        "Quantity"
    ])

    # 3. Write Data Rows
    count = 0
    for visit in visits:
        for disp in visit.dispensations:
            writer.writerow([
                visit.date,
                visit.time,
                visit.patient.name,
                visit.patient.address,
                disp.medicine_name,
                disp.instructions or "",
                disp.quantity
            ])
            count += 1
            
    # 4. Return as a file download
    output.seek(0)
    filename = f"medication_log_{start_date}_to_{end_date}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/reports/dispensations/export-pdf")
def export_dispensations_pdf(
    start_date: date,
    end_date: date,
    db: Session = Depends(database.get_db)
):
    # 1. Query Data
    visits = (
        db.query(models.Visit)
        .join(models.Patient)
        .join(models.DispensationItem)
        .filter(models.Visit.date >= start_date)
        .filter(models.Visit.date <= end_date)
        .order_by(models.Visit.date, models.Visit.time)
        .all()
    )

    # 2. Setup PDF Buffer
    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output, 
        pagesize=landscape(A4), # Landscape gives more width for tables
        rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30
    )
    
    # 3. Prepare Content
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph(f"Medication Dispensation Log: {start_date} to {end_date}", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 20)) # Space between title and table

    # Table Header
    data = [['Date', 'Patient Name', 'Address', 'Medications']]
    
    # Table Body
    for visit in visits:
        # Format Medications: Combine all meds for this visit into one cell, separated by newlines
        med_list = []
        for d in visit.dispensations:
            # e.g., "• Paracetamol (tds) - 20"
            med_text = f"• {d.medicine_name} ({d.instructions or '-'}) [{d.quantity}]"
            med_list.append(med_text)
        
        # Join with <br/> because we are using the Paragraph object which understands HTML-like tags
        meds_string = "<br/>".join(med_list)

        # We use Paragraph() for Address and Meds to enable text wrapping
        row = [
            str(visit.date),
            Paragraph(visit.patient.name, styles['BodyText']),
            Paragraph(visit.patient.address, styles['BodyText']),
            Paragraph(meds_string, styles['BodyText'])
        ]
        data.append(row)

    # 4. Configure Table Layout
    # Column widths: Date(10%), Name(15%), Address(35%), Meds(40%)
    # Landscape A4 width is approx 11.7 inches. Let's use ~10.5 inches total.
    col_widths = [1.0*inch, 1.8*inch, 3.7*inch, 4.0*inch]
    
    table = Table(data, colWidths=col_widths)
    
    # 5. Styling the Table (Grid, Colors, Fonts)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),       # Header background
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),  # Header text color
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),                # Alignment
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),    # Header font
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),                # Align text to top of cell
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),      # Grid lines
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    elements.append(table)

    # 6. Build PDF
    doc.build(elements)
    output.seek(0)
    
    filename = f"medication_log_{start_date}_to_{end_date}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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