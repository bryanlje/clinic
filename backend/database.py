from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# LOCAL CONNECTION STRING
# When moving to GCP, only change this line!
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:leongclinic@localhost:5432/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# Dependency to get DB session in endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()