"""Создание первого admin-пользователя для dev.

Использование:
    python seed_admin.py --username admin --phone +79990000000 --password secret123
"""

import argparse
import asyncio

from sqlalchemy import or_, select

from core.security import hash_password
from database import SessionLocal
from models import service, user  # noqa: F401
from models.user import User


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--username", required=True)
    parser.add_argument("--phone", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    async with SessionLocal() as db:
        existing = await db.scalar(
            select(User).where(or_(User.username == args.username, User.phone_number == args.phone))
        )
        if existing:
            existing.is_admin = True
            existing.hashed_password = hash_password(args.password)
            await db.commit()
            print(f"Admin updated: {existing.username} (id={existing.id})")
            return

        admin = User(
            username=args.username,
            phone_number=args.phone,
            hashed_password=hash_password(args.password),
            is_admin=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        print(f"Admin created: {admin.username} (id={admin.id})")


if __name__ == "__main__":
    asyncio.run(main())
