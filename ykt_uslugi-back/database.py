from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from core.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def seed_categories() -> None:
    initial_categories = {
        "Ремонт": ["Сантехника", "Электрика", "Бытовая техника", "Отделка"],
        "Красота": ["Парикмахер", "Маникюр", "Макияж", "Массаж"],
        "Обучение": ["Репетиторы", "Языки", "Музыка", "Спорт"],
        "IT": ["Разработка", "Настройка техники", "Дизайн", "Маркетинг"],
        "Строительство": ["Бригады", "Проектирование", "Материалы", "Разнорабочие"],
        "Перевозки": ["Грузоперевозки", "Переезды", "Курьеры", "Такси"],
        "Уборка": ["Квартиры", "Офисы", "Химчистка", "Вывоз мусора"],
        "Разное": ["Помощь по дому", "Мероприятия", "Животные", "Другое"],
    }

    from models import review, user  # noqa: F401
    from models.service import Category, Subcategory

    def slugify(value: str) -> str:
        translit = {
            "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh",
            "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
            "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "c",
            "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
        }
        result = "".join(translit.get(ch, ch) for ch in value.lower())
        return "".join(ch if ch.isalnum() else "-" for ch in result).strip("-")

    db = SessionLocal()
    try:
        for category_name, subcategory_names in initial_categories.items():
            category_slug = slugify(category_name)
            category = db.query(Category).filter(Category.slug == category_slug).first()
            if not category:
                category = Category(name=category_name, slug=category_slug)
                db.add(category)
                db.flush()

            for subcategory_name in subcategory_names:
                subcategory_slug = slugify(subcategory_name)
                exists = (
                    db.query(Subcategory)
                    .filter(Subcategory.category_id == category.id, Subcategory.slug == subcategory_slug)
                    .first()
                )
                if not exists:
                    db.add(Subcategory(category_id=category.id, name=subcategory_name, slug=subcategory_slug))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Ошибка при наполнении категорий: {e}")
    finally:
        db.close()
