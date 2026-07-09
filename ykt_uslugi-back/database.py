from collections.abc import AsyncGenerator

from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import DATABASE_URL


def _normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql+psycopg://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("sqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url == "sqlite:///:memory:":
        return "sqlite+aiosqlite:///:memory:"
    return url


SQLALCHEMY_DATABASE_URL = _normalize_database_url(DATABASE_URL)
engine = create_async_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite+aiosqlite"):

    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as db:
        try:
            yield db
        except Exception:
            await db.rollback()
            raise


async def seed_categories() -> None:
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

    async with SessionLocal() as db:
        try:
            for category_name, subcategory_names in initial_categories.items():
                category_slug = slugify(category_name)
                category = await db.scalar(select(Category).where(Category.slug == category_slug))
                if not category:
                    category = Category(name=category_name, slug=category_slug)
                    db.add(category)
                    await db.flush()

                for subcategory_name in subcategory_names:
                    subcategory_slug = slugify(subcategory_name)
                    exists = await db.scalar(
                        select(Subcategory.id).where(
                            Subcategory.category_id == category.id,
                            Subcategory.slug == subcategory_slug,
                        )
                    )
                    if not exists:
                        db.add(Subcategory(category_id=category.id, name=subcategory_name, slug=subcategory_slug))

            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Ошибка при наполнении категорий: {e}")
