FROM python:3.12-slim

WORKDIR /app

# System deps for bcrypt/pillow wheels are already present in slim; install python deps first for caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Persisted data (sqlite db) lives on a mounted volume.
RUN mkdir -p /app/data /app/uploads
ENV DATABASE_URL=sqlite:////app/data/disaster_management.db

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
