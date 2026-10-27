# VCF-Lic-MGMT

License management tooling for VMware Cloud Foundation (VCF).

## Stack

- **Backend**: Python + FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Frontend**: React + Vite + TypeScript

## Project structure

```
backend/   FastAPI app, models, schemas, API routes, tests
frontend/  React + Vite + TypeScript UI
docker-compose.yml  Local PostgreSQL
```

## Getting started

### Database

```
docker compose up -d
```

### Backend

```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`, docs at `http://localhost:8000/docs`.

### Frontend

```
cd frontend
npm install
npm run dev
```

UI available at `http://localhost:5173`.
