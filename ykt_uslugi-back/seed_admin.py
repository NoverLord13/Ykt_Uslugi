"""Создание первого admin-пользователя для dev.

Использование:
    python seed_admin.py --username admin --phone +79990000000 --password secret123
"""

import argparse

from core.security import hash_password
from database import Base, SessionLocal, engine
from models import service, user  # noqa: F401
from models.user import User


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(User).filter((User.username == args.username) | (User.phone_number == args.phone)).first()
        if existing:
            existing.is_admin = True
            existing.hashed_password = hash_password(args.password)
            db.commit()
            print(f"Admin updated: {existing.username} (id={existing.id})")
            return

        admin = User(
            username=args.username,
            phone_number=args.phone,
            hashed_password=hash_password(args.password),
            is_admin=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Admin created: {admin.username} (id={admin.id})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
