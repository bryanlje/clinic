import os, csv, io, hashlib, subprocess
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, func, cast, Integer
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from uuid import UUID
from urllib.parse import urlparse

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
#####################################################
# --- Helper Functions ---
#####################################################

def get_password_hash(password: str) -> str:
    # 1. Generate a random salt
    salt = os.urandom(16).hex()
    # 2. Hash the salt + password
    hash_obj = hashlib.sha256((salt + password).encode())
    # 3. Return format: "salt$hash"
    return f"{salt}${hash_obj.hexdigest()}"

def verify_password(plain_password: str, stored_value: str) -> bool:
    try:
        # 1. Split the stored value into salt and hash
        salt, hash_val = stored_value.split('$')
        # 2. Hash the input using the SAME salt
        verify_obj = hashlib.sha256((salt + plain_password).encode())
        # 3. Compare
        return verify_obj.hexdigest() == hash_val
    except ValueError:
        # Handles cases where stored_value format is wrong
        return False
    
# --- Enforce symmetry for sibling connections ---
def create_sibling_link(db: Session, patient_a_id, patient_b_id):
    """Ensures A is linked to B, and B is linked to A (Idempotent)"""
    # Check A -> B
    exists_a = db.query(models.patient_siblings).filter_by(
        patient_id=patient_a_id, sibling_id=patient_b_id
    ).first()
    if not exists_a:
        stmt = models.patient_siblings.insert().values(patient_id=patient_a_id, sibling_id=patient_b_id)
        db.execute(stmt)

    # Check B -> A
    exists_b = db.query(models.patient_siblings).filter_by(
        patient_id=patient_b_id, sibling_id=patient_a_id
    ).first()
    if not exists_b:
        stmt = models.patient_siblings.insert().values(patient_id=patient_b_id, sibling_id=patient_a_id)
        db.execute(stmt)

#####################################################
# --- API ROUTES ---
#####################################################

@app.post("/api/patients/", response_model=schemas.Patient)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(database.get_db)):
    # Check if ID exists
    existing = db.query(models.Patient).filter(models.Patient.display_id == patient.display_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient ID already exists")
    
    patient_data = patient.dict()
    sibling_ids = patient_data.pop("sibling_ids", []) # Remove from dict
    
    db_patient = models.Patient(**patient_data)
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    if sibling_ids:
        # Use a set to avoid duplicates
        network_ids = set(sibling_ids)        
        # Find existing siblings of the selected siblings
        existing_relatives = db.query(models.patient_siblings).filter(
            models.patient_siblings.c.patient_id.in_(sibling_ids)
        ).all()
        
        for row in existing_relatives:
            network_ids.add(row.sibling_id)
            
        # Create links to everyone found
        for target_id in network_ids:
            if target_id == db_patient.id: continue
            create_sibling_link(db, db_patient.id, target_id)
            
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

    # 3. CLEANUP: Remove sibling links manually
    db.execute(models.patient_siblings.delete().where(
        or_(
            models.patient_siblings.c.patient_id == patient_id,
            models.patient_siblings.c.sibling_id == patient_id
        )
    ))

    # 4. Delete the Patient Record
    db.delete(patient)
    db.commit()

    return {"status": "success", "message": f"Patient {patient.name} and all associated records deleted."}

@app.post("/api/patients/{patient_id}/siblings/{sibling_id}")
def link_sibling(patient_id: UUID, sibling_id: UUID, db: Session = Depends(database.get_db)):
    if patient_id == sibling_id:
        raise HTTPException(status_code=400, detail="Cannot be own sibling")

    # 1. Fetch the main patient to find their EXISTING network
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Get list of all IDs in the current 'clique' (Patient + their existing siblings)
    # We include patient_id itself because the new sibling needs to link to the patient too.
    existing_family_ids = [s.id for s in patient.siblings]
    existing_family_ids.append(patient_id)

    # 3. Link the NEW sibling to EVERYONE in that list
    for family_member_id in existing_family_ids:
        # Skip if we are trying to link the sibling to themselves
        if family_member_id == sibling_id:
            continue
            
        create_sibling_link(db, family_member_id, sibling_id)

    db.commit()
    return {"status": "linked_to_network"}

@app.delete("/api/patients/{patient_id}/siblings/{sibling_id}")
def unlink_sibling(patient_id: UUID, sibling_id: UUID, db: Session = Depends(database.get_db)):
    """
    Removes the sibling from the Patient, AND from all of the Patient's other siblings.
    Essentially removes 'sibling_id' from this specific family cluster.
    """
    
    # 1. Fetch the patient to identify the group
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 2. Identify the group: The patient + all their siblings
    # We want to break the link between 'sibling_id' and ANYONE in this group
    group_ids = [s.id for s in patient.siblings]
    group_ids.append(patient_id)

    # 3. Execute Deletions
    # Remove links where one side is the sibling_id and the other is in the group
    for member_id in group_ids:
        if member_id == sibling_id: 
            continue

        # Remove Member -> Sibling
        db.execute(models.patient_siblings.delete().where(
            (models.patient_siblings.c.patient_id == member_id) & 
            (models.patient_siblings.c.sibling_id == sibling_id)
        ))
        
        # Remove Sibling -> Member
        db.execute(models.patient_siblings.delete().where(
            (models.patient_siblings.c.patient_id == sibling_id) & 
            (models.patient_siblings.c.sibling_id == member_id)
        ))

    db.commit()
    return {"status": "unlinked_from_network"}

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
            notes=item['notes'],
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
    db_visit.age_at_visit = visit_update.age_at_visit
    db_visit.doctor_notes = visit_update.doctor_notes
    db_visit.follow_up = visit_update.follow_up
    
    # Financial Updates
    db_visit.total_charge = visit_update.total_charge
    db_visit.payment_method = visit_update.payment_method
    db_visit.receipt_number = visit_update.receipt_number 

    # MC Updates
    db_visit.mc_days = visit_update.mc_days             
    db_visit.mc_start_date = visit_update.mc_start_date 
    db_visit.mc_end_date = visit_update.mc_end_date     

    # 4. Handle Dispensations (Full Replace Strategy)
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
                notes=item.notes,
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
            med_text = f"• {d.medicine_name} {d.instructions or '-'} ({d.quantity})"
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

# --- Startup Event: Set Default PIN ---
@app.on_event("startup")
def initialize_settings():
    db = database.SessionLocal()
    try:
        # Check if PIN exists
        pin_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "admin_pin").first()
        
        if not pin_config:
            # Get default from Docker Env or use "000000"
            default_pin = os.getenv("INITIAL_ADMIN_PIN", "000000")
            hashed_pin = get_password_hash(default_pin)
            
            new_config = models.SystemConfig(key="admin_pin", value=hashed_pin)
            db.add(new_config)
            db.commit()
            print(f"--- SYSTEM: Admin PIN initialized to default ({default_pin}) ---")
    finally:
        db.close()

@app.post("/api/admin/verify-pin")
def verify_admin_pin(payload: schemas.PinVerify, db: Session = Depends(database.get_db)):
    pin_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "admin_pin").first()
    if not pin_config:
        raise HTTPException(status_code=500, detail="PIN not configured")
    
    if not verify_password(payload.pin, pin_config.value):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    
    return {"status": "valid"}

@app.put("/api/admin/change-pin")
def change_admin_pin(payload: schemas.PinUpdate, db: Session = Depends(database.get_db)):
    pin_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "admin_pin").first()
    
    # 1. Verify Old PIN
    if not pin_config or not verify_password(payload.current_pin, pin_config.value):
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    
    # 2. Set New PIN
    pin_config.value = get_password_hash(payload.new_pin)
    db.commit()
    return {"status": "updated"}

# --- GENERIC CONFIG ENDPOINTS ---

@app.get("/api/config/{key}")
def get_system_config(key: str, db: Session = Depends(database.get_db)):
    """
    Retrieves a config value. Returns a default if not found.
    """
    conf = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    
    # Define defaults for specific keys here
    default_value = "25" 
    
    if not conf:
        return {"key": key, "value": default_value}
    
    return {"key": key, "value": conf.value}

@app.put("/api/config/{key}")
def update_system_config(key: str, payload: schemas.ConfigUpdate, db: Session = Depends(database.get_db)):
    """
    Updates or Creates a config value.
    """
    conf = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    
    if not conf:
        # Create if doesn't exist
        conf = models.SystemConfig(key=key, value=payload.value)
        db.add(conf)
    else:
        # Update if exists
        conf.value = payload.value
        
    db.commit()
    db.refresh(conf)
    return {"status": "updated", "key": key, "value": conf.value}

@app.get("/api/system/backup")
def download_database_backup(
    background_tasks: BackgroundTasks, 
    db: Session = Depends(database.get_db),
    pin: str = None 
):
    """
    Generates a full database dump using the active database connection details.
    """    
    if not pin:
        raise HTTPException(status_code=401, detail="Admin PIN is required.")
    
    stored_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "admin_pin").first()
    if not stored_config or not verify_password(pin, stored_config.value):
        raise HTTPException(status_code=401, detail="Incorrect Admin PIN.")
    
    # 1. Get credentials directly from the active SQLAlchemy Engine
    # This guarantees we use the exact same credentials the app is running on.
    engine = db.get_bind()
    url = engine.url

    db_user = url.username
    db_password = url.password
    db_host = url.host
    db_port = str(url.port) if url.port else "5432"
    db_name = url.database

    # 2. Prepare Backup File Path
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"clinic_backup_{timestamp}.sql"
    filepath = f"/tmp/{filename}"

    # 3. Prepare Environment for pg_dump
    env = os.environ.copy()
    if db_password:
        env["PGPASSWORD"] = db_password

    # 4. Execute pg_dump
    try:
        command = [
            "pg_dump",
            "-h", db_host,
            "-p", db_port, # Added port just in case
            "-U", db_user,
            "-d", db_name,
            "-f", filepath
        ]
        
        subprocess.run(command, env=env, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Backup Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate backup. Check server logs.")
    except FileNotFoundError:
        # This is the specific error for "pg_dump not installed"
        raise HTTPException(status_code=500, detail="pg_dump tool not found on server.")

    return FileResponse(
        path=filepath, 
        filename=filename, 
        media_type='application/octet-stream',
        background=background_tasks.add_task(os.remove, filepath)
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