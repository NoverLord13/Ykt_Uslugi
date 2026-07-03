from sqlalchemy.orm import Session

from models.response import Report


def delete_target_reports(db: Session, target_type: str, target_id: int) -> None:
    """Keep polymorphic report references consistent when their target is deleted."""
    db.query(Report).filter(
        Report.target_type == target_type,
        Report.target_id == target_id,
    ).delete(synchronize_session=False)
