from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import UPLOAD_DIR
from database import Base, engine, seed_categories  # <--- Добавили импорт Base и engine
from models import review, service, user
from routers import admin, auth, categories, services, users

# Создание папки для загрузок
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


# Контекстный менеджер, который срабатывает строго ОДИН раз при запуске сервера
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Автоматически создаем все таблицы в SQLite, если их еще нет в файле БД
    Base.metadata.create_all(bind=engine)
    
    # Теперь таблицы гарантированно существуют, наполнение сработает без ошибок
    seed_categories()
    yield


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
app.include_router(categories.router)
app.include_router(services.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/")
def read_root():
    return {"Hello": "World"}
