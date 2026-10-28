import io

from PIL import Image, UnidentifiedImageError

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class InvalidImageError(Exception):
    pass


def process_image(raw: bytes, max_size: tuple[int, int]) -> tuple[bytes, str]:
    """Validates the upload is actually an image, scales it down (preserving
    aspect ratio) only if it exceeds max_size, and re-encodes it as PNG -
    this also strips anything beyond pixel data (e.g. a script embedded in
    a disguised SVG/HTML file would fail to decode here)."""
    if len(raw) > MAX_UPLOAD_BYTES:
        raise InvalidImageError("파일이 너무 큽니다 (최대 15MB).")
    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except UnidentifiedImageError as err:
        raise InvalidImageError("이미지 파일이 아닙니다.") from err

    if image.mode != "RGBA":
        image = image.convert("RGBA")
    image.thumbnail(max_size, Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue(), "image/png"
