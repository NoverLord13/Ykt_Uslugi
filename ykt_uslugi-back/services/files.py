import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from core.config import UPLOAD_DIR

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024


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

    upload_path = Path(UPLOAD_DIR).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_path / filename
    file_path.write_bytes(content)

    return f"/uploads/{filename}"


def delete_upload(url: str | None) -> None:
    if not url or not url.startswith("/uploads/"):
        return
    upload_path = Path(UPLOAD_DIR).resolve()
    file_path = (upload_path / Path(url).name).resolve()
    if file_path.parent == upload_path:
        file_path.unlink(missing_ok=True)


async def save_uploads(files: list[UploadFile]) -> list[str]:
    saved: list[str] = []
    try:
        for file in files:
            saved.append(await save_upload(file))
        return saved
    except Exception:
        for url in saved:
            delete_upload(url)
        raise
