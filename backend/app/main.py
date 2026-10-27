from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.licenses import router as licenses_router
from app.core.config import settings

app = FastAPI(title="VCF License Management")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(licenses_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health():
    return {"status": "ok"}
