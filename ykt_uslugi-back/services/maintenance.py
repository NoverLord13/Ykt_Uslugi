import asyncio
import logging

from core.config import DEAL_MAINTENANCE_INTERVAL_SECONDS
from database import SessionLocal
from services.deals import auto_complete_overdue

logger = logging.getLogger(__name__)


async def run_deal_maintenance() -> None:
    async with SessionLocal() as db:
        try:
            changed = await auto_complete_overdue(db)
            if changed:
                await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Deal maintenance failed")


async def deal_maintenance_loop() -> None:
    while True:
        await run_deal_maintenance()
        await asyncio.sleep(DEAL_MAINTENANCE_INTERVAL_SECONDS)
