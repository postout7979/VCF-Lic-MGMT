from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.auth import require_admin
from app.core.database import get_db
from app.models.brand_settings import BrandSettings
from app.schemas.brand import BrandInfoResponse
from app.services.image_service import InvalidImageError, process_image

router = APIRouter(prefix="/brand", tags=["brand"])

# Background covers the full login page; logo sits above a 360px-wide
# login box, so it's kept comparatively small.
MAX_BACKGROUND_SIZE = (1920, 1080)
MAX_LOGO_SIZE = (400, 200)


def _get_or_create(db: Session) -> BrandSettings:
    settings = db.get(BrandSettings, 1)
    if settings is None:
        settings = BrandSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _to_info(settings: BrandSettings) -> BrandInfoResponse:
    return BrandInfoResponse(
        has_background_image=settings.background_image is not None,
        has_logo_image=settings.logo_image is not None,
        has_default_background_image=settings.default_background_image is not None,
        has_default_logo_image=settings.default_logo_image is not None,
        updated_at=settings.updated_at,
    )


# GET endpoints are intentionally public (no auth dependency) - the login
# page itself needs to fetch them before anyone is signed in.


@router.get("/info", response_model=BrandInfoResponse)
def get_brand_info(db: Session = Depends(get_db)):
    return _to_info(_get_or_create(db))


@router.get("/background-image")
def get_background_image(db: Session = Depends(get_db)):
    settings = db.get(BrandSettings, 1)
    if settings is None or settings.background_image is None:
        raise HTTPException(status_code=404, detail="배경 이미지가 설정되지 않았습니다.")
    return Response(
        content=settings.background_image,
        media_type=settings.background_image_mimetype or "image/png",
    )


@router.get("/logo-image")
def get_logo_image(db: Session = Depends(get_db)):
    settings = db.get(BrandSettings, 1)
    if settings is None or settings.logo_image is None:
        raise HTTPException(status_code=404, detail="로고 이미지가 설정되지 않았습니다.")
    return Response(
        content=settings.logo_image,
        media_type=settings.logo_image_mimetype or "image/png",
    )


@router.post(
    "/background-image", response_model=BrandInfoResponse, dependencies=[Depends(require_admin)]
)
def upload_background_image(file: UploadFile, db: Session = Depends(get_db)):
    raw = file.file.read()
    try:
        processed, mimetype = process_image(raw, MAX_BACKGROUND_SIZE)
    except InvalidImageError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    settings = _get_or_create(db)
    settings.background_image = processed
    settings.background_image_mimetype = mimetype
    db.commit()
    db.refresh(settings)
    return _to_info(settings)


@router.delete(
    "/background-image", status_code=204, dependencies=[Depends(require_admin)]
)
def delete_background_image(db: Session = Depends(get_db)):
    settings = _get_or_create(db)
    settings.background_image = None
    settings.background_image_mimetype = None
    db.commit()


@router.post(
    "/logo-image", response_model=BrandInfoResponse, dependencies=[Depends(require_admin)]
)
def upload_logo_image(file: UploadFile, db: Session = Depends(get_db)):
    raw = file.file.read()
    try:
        processed, mimetype = process_image(raw, MAX_LOGO_SIZE)
    except InvalidImageError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    settings = _get_or_create(db)
    settings.logo_image = processed
    settings.logo_image_mimetype = mimetype
    db.commit()
    db.refresh(settings)
    return _to_info(settings)


@router.delete("/logo-image", status_code=204, dependencies=[Depends(require_admin)])
def delete_logo_image(db: Session = Depends(get_db)):
    settings = _get_or_create(db)
    settings.logo_image = None
    settings.logo_image_mimetype = None
    db.commit()


@router.post(
    "/reset-to-default", response_model=BrandInfoResponse, dependencies=[Depends(require_admin)]
)
def reset_to_default(db: Session = Depends(get_db)):
    settings = _get_or_create(db)
    settings.background_image = settings.default_background_image
    settings.background_image_mimetype = settings.default_background_image_mimetype
    settings.logo_image = settings.default_logo_image
    settings.logo_image_mimetype = settings.default_logo_image_mimetype
    db.commit()
    db.refresh(settings)
    return _to_info(settings)
