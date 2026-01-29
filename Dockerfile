# --- Stage 1: Build React Frontend ---
FROM node:18-alpine as build-frontend
WORKDIR /app/frontend
# Copy package.json and install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
# Copy source code and build
COPY frontend/ ./
# This builds the app to /app/frontend/dist
RUN npm run build 

# --- Stage 2: Python Backend ---
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for Postgres driver)
RUN apt-get update && apt-get install -y libpq-dev gcc

# Copy requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install Gunicorn for production server
RUN pip install gunicorn

# Copy Backend Code
COPY backend/ ./backend

# Copy Built Frontend from Stage 1
COPY --from=build-frontend /app/frontend/dist /app/frontend/dist

# Set Environment Variables
ENV FRONTEND_DIST_PATH=/app/frontend/dist
ENV PYTHONPATH=/app

# Expose port
EXPOSE 8000

# Run Command: Gunicorn running FastAPI
# "backend.main:app" means look in backend folder, main.py file, app object
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "backend.main:app"]