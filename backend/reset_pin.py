# backend/reset_pin.py
from database import SessionLocal
from models import SystemConfig

def reset_admin_pin():
    db = SessionLocal()
    try:
        # Find and delete the admin_pin row
        num_deleted = db.query(SystemConfig).filter(SystemConfig.key == "admin_pin").delete()
        db.commit()
        
        if num_deleted > 0:
            print("✅ SUCCESS: 'admin_pin' configuration deleted.")
            print("👉 Now RESTART your Uvicorn server to generate the default 000000 PIN.")
        else:
            print("ℹ️ INFO: No PIN was found in the database. It might already be cleared.")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_admin_pin()