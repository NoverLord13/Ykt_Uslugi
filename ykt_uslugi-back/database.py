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


def seed_categories():
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
