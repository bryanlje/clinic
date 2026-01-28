from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time

# --- Visit Schemas ---
class VisitBase(BaseModel):
    date: date
    time: time
    weight: float
    doctor_notes: Optional[str] = None
    total_charge: Optional[float] = None

class VisitUpdate(VisitBase):
    pass

class VisitCreate(VisitBase):
    patient_id: str

class VisitAttachmentBase(BaseModel):
    id: int
    file_path: str
    original_filename: str
    file_type: str

    class Config:
        from_attributes = True

class Visit(VisitBase):
    visit_id: int
    patient_id: str
    attachments: List[VisitAttachmentBase] = []
    class Config:
        from_attributes = True

# --- Patient Schemas ---
class PatientBase(BaseModel):
    id: str
    name: str
    date_of_birth: date
    address: str
    phone_number_primary: str
    phone_number_secondary: Optional[str] = None
    father_name: Optional[str] = None
    father_occupation: Optional[str] = None
    mother_name: Optional[str] = None
    mother_occupation: Optional[str] = None
    para: Optional[str] = None
    languages: List[str] = []
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
    visits: List[Visit] = []
    class Config:
        from_attributes = True