from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from core.domain_types import ReportTargetType
from models.response import Report


async def delete_target_reports(db: AsyncSession, target_type: ReportTargetType, target_id: int) -> None:
    await db.execute(delete(Report).where(Report.target_type == target_type, Report.target_id == target_id))
