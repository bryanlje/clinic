# Leong Baby & Child Clinic Management System

A full-stack clinic management application designed for paediatric care. This system streamlines patient registration, visit recording, medical history tracking, and family relationship management. It is built with a modern React frontend and a high-performance FastAPI backend, containerized for easy deployment.

## 🚀 Tech Stack

### Frontend

* **Framework:** React (Vite)
* **Routing:** React Router DOM (v6)
* **Styling:** CSS3 (Custom responsive design)
* **HTTP Client:** Axios

### Backend

* **Framework:** Python FastAPI
* **ORM:** SQLAlchemy
* **Validation:** Pydantic
* **Security:** Hashlib (SHA-256 with salt) for PIN verification

### Database & Infrastructure

* **Database:** PostgreSQL
* **Containerization:** Docker & Docker Compose
* **Migrations:** Alembic

---

## ✨ Key Features

### 1. Patient Management

* **Comprehensive Registration:** detailed capturing of patient demographics, birth details (delivery mode, birth weight/length/OFC), and parental information.
* **Medical Profile:** Tracking of critical medical data such as G6PD status, allergies, TSH levels, and vaccination summaries.
* **Advanced Search:** Filter patients by Name, ID, Address, DOB range, Registration Date, or Visit Date.
* **Recent Patients:** Quick-access "Recently Viewed" chips stored in local storage.

### 2. Clinical Workflow (Visits)

* **Visit Recording:** Log timestamps, diagnosis, notes, and medication dispensations.
* **Medical History:** View a chronological timeline of all previous visits for a patient.
* **Medication Export:** Generate summary reports of dispensed medications for inventory tracking.

### 3. Sibling & Family Networking

* **Transitive Linking:** Intelligent sibling linking system. If Patient A is linked to Patient B, and Patient B is linked to Patient C, the system automatically detects and links Patient A to Patient C, forming a complete family cluster.
* **Unified View:** Display siblings sorted by birth order in the patient detail view.

### 4. System Security & Configuration

* **Admin PIN Protection:** Sensitive actions (Deleting Patients/Visits, Changing System Configs) are protected by a secure 6-digit PIN.
* **Dynamic Configuration:** Administrators can adjust system settings (e.g., Search Result Limits) directly from the UI.
* **Secure Hashing:** PINs are stored using salted SHA-256 hashing (no plain text storage).

### 5. Application Architecture

* **SPA Routing:** Full support for deep linking (e.g., `/patient/{uuid}`) and "Open in New Tab" functionality.
* **SPA Fallback:** The backend is configured to serve the React frontend and handle client-side routing fallback (preventing 404s on refresh).

---

## 🛠️ Installation & Setup

### Prerequisites

* Docker
* (Optional for local dev) Node.js v18+ and Python 3.11+

### Option A: Running with Docker Compose (Recommended)
This is the easiest and most reliable method. It automatically sets up the database, the application, and the network configuration using a single file.

1. **Prepare the Compose File**: Clone this repository or copy the contents of docker-compose.yaml.

- Important: Update the volume path "/mnt/c/Users/..." to the actual folder on your computer where you want to store uploaded patient documents.

2. **Start the Application**: Run this command in the same folder as your yaml file:
```bash
docker compose up -d
```
- You can now access the app at http://localhost:8000
3. **Stop the Application**: To stop the containers but keep your data safe:
```bash
docker compose down
```
4. **Restore Database from Backup (Optional)**: If you have a .sql backup file (e.g., backup.sql) and want to load it into the running database:
```bash
# 1. Copy the file into the container
docker cp ./backup.sql clinic-db:/tmp/restore.sql

# 2. Execute the restore command
docker exec -it clinic-db psql -U postgres -d postgres -f /tmp/restore.sql

# 3. Optional: Delete the file from inside the container to save space
docker exec clinic-db rm /tmp/restore.sql
```

### Option B: Running with Docker Commands (Manual)

This will set up the Database, Backend, and Frontend in two simple commands.

1. **Setup Local Directory:**
* Create a directory for the uploaded patient documents to be stored. This directory will be mounted to the Docker container.


2. **Setup Docker environment:**
```bash
docker network create clinic-network
docker volume create clinic_db_data

```
* The persistent volume ensures data is preserved properly.

3. **Run the PostgreSQL database container:**
```bash
docker run -d \
  --restart unless-stopped \
  --name clinic-db \
  --network clinic-network \
  -e POSTGRES_PASSWORD=leongclinic \
  -v clinic_db_data:/var/lib/postgresql/data \
  postgres:16

```
4. **Run the clinic application interface:**
```bash
docker run -d \
  --restart unless-stopped \
  -p 8000:8000 \
  --name clinic-app \
  --network clinic-network \
  -e ENVIRONMENT=local \
  -e DATABASE_URL=postgresql://postgres:leongclinic@clinic-db:5432/postgres \
  -v "/mnt/c/Users/filepath/to/attachment_uploads:/app/backend/uploads" \
  mulberrydunes/leong-clinic:2.0

```

5. **Access the app:**
* **Frontend:** Open `http://localhost:8000` (The backend serves the built frontend).
* **API Documentation:** Open `http://localhost:8000/docs` to see the Swagger UI.



### Option C: Local Development (Manual)

**1. Database Setup**
Ensure you have a PostgreSQL instance running and update `backend/database.py` or your `.env` file with the connection string.

**2. Backend Setup**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run Database Migrations
alembic upgrade head

# Start Server
uvicorn main:app --reload --port 8000

```

**3. Frontend Setup**

```bash
cd frontend
npm install
npm run dev
# The frontend will run on http://localhost:5173

```

---

## ⚙️ Configuration

### Default Credentials

* **Default Admin PIN:** `000000`
* *Note: Upon first startup, the system initializes this PIN. You should change it immediately via the "Menu > Change Admin PIN" option.*



### Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@db:5432/clinic` |
| `FRONTEND_DIST_PATH` | Path to serve React build files | `/app/frontend/dist` |

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── alembic/              # Database migrations
│   ├── models.py             # SQLAlchemy Database Models
│   ├── schemas.py            # Pydantic Response/Request Schemas
│   ├── main.py               # FastAPI entry point & routes
│   ├── database.py           # DB Connection logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios configuration
│   │   ├── components/       # React Components (Dashboard, Patients, Common)
│   │   ├── utils/            # Helper functions (Recents, Dates)
│   │   ├── App.jsx           # Main Router Logic
│   │   └── main.jsx          # Entry point
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
└── Dockerfile                # Multi-stage build (Node -> Python)

```

## 🛡️ License

[]
