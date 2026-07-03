import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import CORS_ORIGINS, UPLOAD_DIR
from database import seed_categories
from models import response, review, service, user
from routers import admin, auth, categories, responses, services, users
from services.maintenance import deal_maintenance_loop

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    seed_categories()
    maintenance_task = asyncio.create_task(deal_maintenance_loop())
    try:
        yield
    finally:
        maintenance_task.cancel()
        with suppress(asyncio.CancelledError):
            await maintenance_task


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
def read_root() -> dict[str, str]:
    return {"Hello": "World"}
