from sqlalchemy import Column, Float, Integer, String, Boolean, Date, Time, create_engine, inspect, ForeignKey
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.dialects.postgresql import ARRAY

class Base(DeclarativeBase):
    pass

################################################################################

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True) # eg "A1147"
    name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    address = Column(String, nullable=False)
    phone_number_primary = Column(String, nullable=False)
    phone_number_secondary = Column(String, nullable=True)

    father_name = Column(String, nullable=True)
    father_occupation = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    mother_occupation = Column(String, nullable=True)
    para = Column(String, nullable=True)

    languages = Column(ARRAY(String), nullable=False)

    hospital = Column(String, nullable=True)
    delivery = Column(String, nullable=True)
    birth_weight_kg = Column(Float, nullable=True)
    birth_length_cm = Column(Float, nullable=True)
    birth_ofc_cm = Column(Integer, nullable=True)
    g6pd_deficient = Column(Boolean, nullable=True)
    tsh_mlul = Column(Integer, nullable=True)
    feeding = Column(String, nullable=True)

    allergies = Column(String, nullable=True)
    other_notes = Column(String, nullable=True)

    # Foreign key to visits. Lets us do patient_obj.visits
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")

################################################################################

class Visit(Base):
    __tablename__ = "visits"

    visit_id = Column(Integer, primary_key=True, autoincrement=True)

    # FOREIGN KEY: This links the visit to a specific patient ID
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)

    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    weight = Column(Float, nullable=False)
    doctor_notes = Column(String, nullable=True)
    total_charge = Column(Float, nullable=True)

    # Relationship back to the patient object
    patient = relationship("Patient", back_populates="visits")

################################################################################

# Physically creates the tables in local Postgres
engine = create_engine("postgresql://postgres:leongclinic@localhost:5432/postgres")

# Drop old version of table then recreate
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)

################################################################################

inspector = inspect(engine)
patient_columns = inspector.get_columns('patients')
visits_columns = inspector.get_columns('visits')

print("--- COLUMNS FOR PATIENTS TABLE: ---")
for col in patient_columns:
    print(col)

print("\n--- COLUMNS FOR VISITS TABLE: ---")
for col in visits_columns:
    print(col)