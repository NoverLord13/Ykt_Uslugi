import asyncio
import logging

from core.config import DEAL_MAINTENANCE_INTERVAL_SECONDS
from database import SessionLocal
from services.deals import auto_complete_overdue

logger = logging.getLogger(__name__)


def run_deal_maintenance() -> None:
    db = SessionLocal()
    try:
        changed = auto_complete_overdue(db)
        if changed:
            db.commit()
    except Exception:
        db.rollback()
        logger.exception("Deal maintenance failed")
    finally:
        db.close()


async def deal_maintenance_loop() -> None:
    while True:
        await asyncio.to_thread(run_deal_maintenance)
        await asyncio.sleep(DEAL_MAINTENANCE_INTERVAL_SECONDS)
