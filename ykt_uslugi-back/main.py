from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import CORS_ORIGINS, UPLOAD_DIR
from database import seed_categories
from models import response, review, service, user
from routers import admin, auth, categories, responses, services, users

# Создание папки для загрузок
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


# Контекстный менеджер, который срабатывает строго ОДИН раз при запуске сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Схема создаётся Alembic-миграциями до запуска приложения.
    await seed_categories()
    yield


# Передаем lifespan в конструктор приложения
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(services.router)
app.include_router(users.router)
app.include_router(responses.router)
app.include_router(admin.router)


@app.get("/")
async def read_root():
    return {"Hello": "World"}
