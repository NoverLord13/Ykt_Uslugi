import asyncio
from io import BytesIO
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from core.config import UPLOAD_DIR

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024
MAX_IMAGE_SIZE = (1920, 1920)
THUMBNAIL_SIZE = (640, 480)


def _detected_extension(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if content.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return ".webp"
    return None


async def save_upload(file: UploadFile) -> str:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл не выбран")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Допустимые форматы: jpg, jpeg, png, webp, gif",
        )

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл должен быть изображением")

    content = await file.read(MAX_FILE_SIZE + 1)
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл пуст")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл слишком большой (макс. 5 МБ)")

    detected_ext = _detected_extension(content)
    normalized_ext = ".jpg" if ext == ".jpeg" else ext
    if detected_ext != normalized_ext:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Содержимое файла не соответствует формату")

    filename = f"{uuid.uuid4().hex}{ext}"
    upload_path = Path(UPLOAD_DIR).resolve()
    try:
        await asyncio.to_thread(_write_image_files, content, upload_path, filename, ext)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Не удалось обработать изображение") from exc

    return f"/uploads/{filename}"


def _write_image_files(content: bytes, upload_path: Path, filename: str, ext: str) -> None:
    upload_path.mkdir(parents=True, exist_ok=True)
    file_path = upload_path / filename
    thumbnail_path = upload_path / f"{Path(filename).stem}.thumb.webp"

    with Image.open(BytesIO(content)) as source:
        image = ImageOps.exif_transpose(source)
        image.thumbnail(MAX_IMAGE_SIZE, Image.Resampling.LANCZOS)
        if ext == ".gif":
            file_path.write_bytes(content)
        elif ext in {".jpg", ".jpeg"}:
            image.convert("RGB").save(file_path, "JPEG", quality=88, optimize=True)
        elif ext == ".png":
            image.save(file_path, "PNG", optimize=True)
        else:
            image.save(file_path, "WEBP", quality=88, method=4)

        thumbnail = image.copy()
        thumbnail.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
        thumbnail.convert("RGB").save(thumbnail_path, "WEBP", quality=80, method=4)


def ensure_upload_thumbnails() -> None:
    upload_path = Path(UPLOAD_DIR).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)
    for file_path in upload_path.iterdir():
        if not file_path.is_file() or file_path.name.endswith(".thumb.webp"):
            continue
        thumbnail_path = file_path.with_name(f"{file_path.stem}.thumb.webp")
        if thumbnail_path.exists():
            continue
        try:
            with Image.open(file_path) as source:
                thumbnail = ImageOps.exif_transpose(source)
                thumbnail.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                thumbnail.convert("RGB").save(thumbnail_path, "WEBP", quality=80, method=4)
        except (UnidentifiedImageError, OSError, ValueError):
            continue


def thumbnail_url(url: str | None) -> str | None:
    if not url or not url.startswith("/uploads/"):
        return url
    path = Path(url)
    return str(path.with_name(f"{path.stem}.thumb.webp"))


def delete_upload(url: str | None) -> None:
    if not url or not url.startswith("/uploads/"):
        return
    upload_path = Path(UPLOAD_DIR).resolve()
    file_path = (upload_path / Path(url).name).resolve()
    if file_path.parent == upload_path:
        file_path.unlink(missing_ok=True)
        thumbnail_path = file_path.with_name(f"{file_path.stem}.thumb.webp")
        thumbnail_path.unlink(missing_ok=True)


async def save_uploads(files: list[UploadFile]) -> list[str]:
    saved: list[str] = []
    try:
        for file in files:
            saved.append(await save_upload(file))
        return saved
    except Exception:
        await asyncio.gather(*(asyncio.to_thread(delete_upload, url) for url in saved))
        raise
