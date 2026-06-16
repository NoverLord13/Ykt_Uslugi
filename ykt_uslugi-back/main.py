from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import UPLOAD_DIR
from database import Base, engine, seed_tags  # <-- Импортируем функцию сидинга
from models import service, user  # <-- Убедитесь, что модель Tag импортирована для создания таблицы
from routers import admin, auth, services

# Создание таблиц (если их нет)
Base.metadata.create_all(bind=engine)

# Создание папки для загрузок
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


# Контекстный менеджер, который срабатывает строго ОДИН раз при запуске сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код здесь выполняется ДО того, как приложение начнет принимать запросы
    seed_tags()  # Наполняем базу тегами
    yield
    # Код здесь выполнится при выключении сервера (если нужно)


# Передаем lifespan в конструктор приложения
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(auth.router)
app.include_router(services.router)
app.include_router(admin.router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
