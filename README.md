# VCF-Lic-MGMT

License management tooling for VMware Cloud Foundation (VCF).

## Stack

- **Backend**: Python + FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Frontend**: React + Vite + TypeScript

## Project structure

```
backend/   FastAPI app, models, schemas, API routes, tests
frontend/  React + Vite + TypeScript UI
docker-compose.yml  db + backend + frontend containers
```

## Getting started (Docker)

```
docker compose up --build
```

This starts three containers:

- `db` — PostgreSQL 16 on `localhost:5432`
- `backend` — FastAPI on `http://localhost:8000` (docs at `/docs`)
- `frontend` — Vite dev server on `http://localhost:5173`, proxying `/api` to the backend container

The backend creates its tables automatically on startup once the database is healthy (no Alembic migration yet).

### Running without Docker

```
# database only
docker compose up -d db

# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# frontend
cd frontend
npm install
npm run dev
```

## Features

- **관리자 (Admin)** — tabbed panel
  - **공급자 데이터**: upload a supplier license Excel file (`.xlsx`, same layout as the sample file); the importer matches columns by header name and stores Serial Number, Parent Customer, Customer Name, License Key, License Type, Product Name, Quantity - ENT, Contract Status, Start Date, End Date, ERP Site ID, Enduser Account Name, Part Number, Division. Re-uploading updates existing rows by Serial Number instead of duplicating them.
  - **프로젝트**: create projects; click "Assign" on a project to pick from license items that aren't yet assigned to any project (shown by Enduser Customer Name / Product Name / ERP Site ID) and assign them. An item can only belong to one project at a time.
- **라이센스 종합 현황** / **실시간 사용 현황** — placeholder pages (not yet specified).
- **프로젝트** (left nav) — lists every project with its Perpetual / Subscription Quantity-ENT totals; clicking a project switches the panel to a detail view listing every license item assigned to it.

Tables are created automatically on backend startup (no Alembic migration yet).
