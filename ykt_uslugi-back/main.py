from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import UPLOAD_DIR
from database import Base, engine
from models import service, user  # noqa: F401
from routers import admin, auth, services

Base.metadata.create_all(bind=engine)

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI()

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
