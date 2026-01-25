from database import engine
from models import Base

print("Dropping all tables...")
# This creates a "Clean Slate" by deleting everything
Base.metadata.drop_all(bind=engine) 

print("Recreating tables...")
# This looks at your CURRENT models.py and builds new tables
Base.metadata.create_all(bind=engine)

print("Database reset complete! You can now restart your server.")