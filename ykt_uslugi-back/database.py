from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from core.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_tags():

    INITIAL_TAGS = ["IT", "Дизайн", "Ремонт", "Маркетинг", "Копирайтинг", "Обучение", "Разнорабочий"]
    from models.service import Tag
    
    db = SessionLocal()
    try:
        for tag_name in INITIAL_TAGS:
            # Проверяем, существует ли уже такой тег в базе
            exists = db.query(Tag).filter(Tag.name == tag_name).first()
            if not exists:
                new_tag = Tag(name=tag_name)
                db.add(new_tag)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Ошибка при наполнении тегов: {e}")
    finally:
        db.close()