from uuid import UUID
from pydantic import BaseModel, UUID4
from typing import List, Optional
from datetime import date as date_type, time as time_type

# --- Dispensation Schemas ---
class DispensationItemBase(BaseModel):
    medicine_name: str
    instructions: Optional[str] = None
    quantity: str
    notes: Optional[str] = None
    is_dispensed: bool = True

class DispensationItemCreate(DispensationItemBase):
    pass

class DispensationItem(DispensationItemBase):
    id: int
    visit_id: int
    class Config:
        from_attributes = True

# --- Visit Schemas ---
class VisitBase(BaseModel):
    patient_id: UUID
    date: date_type
    time: time_type
    weight: float
    age_at_visit: Optional[str] = None
    doctor_notes: Optional[str] = None
    
    # Financials
    total_charge: Optional[float] = None
    payment_method: Optional[str] = None
    receipt_number: Optional[str] = None
    
    # MC
    mc_days: Optional[int] = None
    mc_start_date: Optional[date_type] = None
    mc_end_date: Optional[date_type] = None

class VisitUpdate(VisitBase):
    patient_id: Optional[UUID] = None
    dispensations: List[DispensationItemCreate] = []

class VisitCreate(VisitBase):
    dispensations: List[DispensationItemCreate] = []

class VisitAttachmentBase(BaseModel):
    id: int
    file_path: str
    original_filename: str
    file_type: str

    class Config:
        from_attributes = True

class Visit(VisitBase):
    visit_id: int
    attachments: List[VisitAttachmentBase] = []
    dispensations: List[DispensationItem] = []
    
    class Config:
        from_attributes = True

# --- Patient Schemas ---
class PatientBase(BaseModel):
    display_id: str
    date_registered: Optional[date_type] = None
    name: str
    date_of_birth: date_type
    address: str
    phone_number_primary: str
    phone_number_secondary: Optional[str] = None
    father_name: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_name: Optional[str] = None
    mother_occupation: Optional[str] = None
    para: Optional[str] = None
    languages_parents: List[str] = []
    languages_children: List[str] = []
    hospital: Optional[str] = None
    delivery: Optional[str] = None
    birth_weight_kg: Optional[float] = None
    birth_length_cm: Optional[float] = None
    birth_ofc_cm: Optional[int] = None
    g6pd: Optional[str] = None
    tsh_mlul: Optional[int] = None
    feeding: Optional[str] = None
    allergies: Optional[str] = None
    vaccination_summary: Optional[str] = None
    other_notes: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: UUID
    visits: List[Visit] = []
    class Config:
        from_attributes = True

class PinVerify(BaseModel):
    pin: str

class PinUpdate(BaseModel):
    current_pin: str
    new_pin: str