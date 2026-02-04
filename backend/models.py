import uuid
from sqlalchemy import Column, Float, Integer, String, Boolean, Date, Time, ForeignKey, func, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from database import Base

# Association Table for Siblings
patient_siblings = Table(
    'patient_siblings', Base.metadata,
    Column('patient_id', UUID(as_uuid=True), ForeignKey('patients.id'), primary_key=True),
    Column('sibling_id', UUID(as_uuid=True), ForeignKey('patients.id'), primary_key=True)
)

class Patient(Base):
    __tablename__ = "patients"
    
    # id is surrogate key. Database handles it, users never handle it.
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # display_id is the business key used.
    display_id = Column(String, unique=True, nullable=False, index=True)

    date_registered = Column(Date, nullable=False, server_default=func.current_date())
    name = Column(String, nullable=False, index=True)
    date_of_birth = Column(Date, nullable=False, index=True)
    address = Column(String, nullable=False)
    phone_number_primary = Column(String, nullable=False)
    phone_number_secondary = Column(String, nullable=True)
    father_name = Column(String, nullable=True)
    father_occupation = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    mother_occupation = Column(String, nullable=True)
    para = Column(String, nullable=True)
    languages_parents = Column(ARRAY(String), nullable=False)
    languages_children = Column(ARRAY(String), nullable=False)
    hospital = Column(String, nullable=True)
    delivery = Column(String, nullable=True)
    birth_weight_kg = Column(Float, nullable=True)
    birth_length_cm = Column(Float, nullable=True)
    birth_ofc_cm = Column(Integer, nullable=True)
    g6pd = Column(String, nullable=True)
    tsh_mlul = Column(Integer, nullable=True)
    feeding = Column(String, nullable=True)
    allergies = Column(String, nullable=True)
    vaccination_summary = Column(String, nullable=True)
    other_notes = Column(String, nullable=True)
    
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    siblings = relationship(
        'Patient',
        secondary=patient_siblings,
        primaryjoin=id==patient_siblings.c.patient_id,
        secondaryjoin=id==patient_siblings.c.sibling_id,
        lazy="select" # loads only when accessing .siblings
    )

class Visit(Base):
    __tablename__ = "visits"
    
    visit_id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(Time, nullable=False)

    # Clinical data
    weight = Column(Float, nullable=False)
    age_at_visit = Column(String, nullable=True)
    doctor_notes = Column(String, nullable=True)

    # Financial data
    total_charge = Column(Float, nullable=True)
    payment_method = Column(String, nullable=True) # Cash, TnG, Online
    receipt_number = Column(String, nullable=True)

    # MC data
    mc_days = Column(Integer, nullable=True)
    mc_start_date = Column(Date, nullable=True)
    mc_end_date = Column(Date, nullable=True)
    
    patient = relationship("Patient", back_populates="visits")
    attachments = relationship("VisitAttachment", back_populates="visit", cascade="all, delete-orphan")
    dispensations = relationship("DispensationItem", back_populates="visit", cascade="all, delete-orphan")

class VisitAttachment(Base):
    __tablename__ = "visit_attachments"
    id = Column(Integer, primary_key=True, autoincrement=True)
    visit_id = Column(Integer, ForeignKey("visits.visit_id"), nullable=False, index=True)
    file_path = Column(String, nullable=False)       
    file_type = Column(String, nullable=False)       
    original_filename = Column(String, nullable=False) 
    visit = relationship("Visit", back_populates="attachments")

class DispensationItem(Base):
    __tablename__ = "dispensation_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    visit_id = Column(Integer, ForeignKey("visits.visit_id"), nullable=False, index=True)    
    # Example: "Paracetamol 5ml"
    medicine_name = Column(String, nullable=False)    
    # Example: "tds PRM" (To be taken three times a day, as needed)
    instructions = Column(String, nullable=True)    
    # Example: "60ml" or "x1"
    quantity = Column(String, nullable=False)
    # Optional: Extra notes for dispensation
    notes = Column(String, nullable=True)    
    # Optional: Track if this item was actually dispensed or just prescribed
    is_dispensed = Column(Boolean, default=True) 

    visit = relationship("Visit", back_populates="dispensations")

class SystemConfig(Base):
    __tablename__ = "system_configs"
    
    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)