# Ykt.Услуги Backend

FastAPI API площадки объявлений услуг. Общая документация и полный локальный запуск находятся в [корневом README](../README.md).

## Стек

- Python 3.12+
- FastAPI и Pydantic 2
- SQLAlchemy 2
- Alembic
- PostgreSQL по умолчанию
- JWT Bearer auth
- локальное хранение изображений
- development SMS-адаптер

## Запуск

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://ykt_uslugi:ykt_uslugi@localhost:5432/ykt_uslugi
alembic upgrade head
uvicorn main:app --reload
```

Команды выполняются из `ykt_uslugi-back`, иначе относительный путь `uploads` укажет в другой каталог. PostgreSQL должен быть доступен по `DATABASE_URL`; проще всего поднять его через корневой `docker compose`.

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- OpenAPI: `http://localhost:8000/openapi.json`

## Docker

Из корня репозитория:

```bash
cp .env.example .env
docker compose up --build -d
docker compose logs -f backend
```

Backend-образ перед каждым запуском выполняет `alembic upgrade head`, затем запускает один процесс Uvicorn на `0.0.0.0:8000`.

В Compose используются:

```text
DATABASE_URL=postgresql+asyncpg://<user>:<password>@db:5432/<db>
UPLOAD_DIR=/data/uploads
```

PostgreSQL хранит данные в named volume `postgres_data`, изображения — в `backend_uploads`. Для проверки миграции:

```bash
docker compose exec backend alembic current
```

## Конфигурация

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | Режим запуска |
| `SECRET_KEY` | development-ключ | Подпись JWT |
| `DATABASE_URL` | `postgresql+asyncpg://ykt_uslugi:ykt_uslugi@localhost:5432/ykt_uslugi` | async URL базы данных |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Срок access token |
| `SMS_CODE_TTL_SECONDS` | `300` | Срок SMS-кода |
| `SMS_RESEND_COOLDOWN_SECONDS` | `60` | Rate limit повторного кода |
| `VERIFICATION_TOKEN_EXPIRE_MINUTES` | `15` | Срок подтверждения телефона |
| `UPLOAD_DIR` | `uploads` | Каталог изображений |
| `CORS_ORIGINS` | `http://localhost:5173` | Origins через запятую |

`core/config.py` читает `os.environ`, но не загружает `.env` автоматически. `.env.example` — справочный шаблон.

В `production` приложение завершит запуск, если используется стандартный небезопасный `SECRET_KEY`.

## Формат ответа

Успешные ответы имеют общую оболочку:

```json
{
  "success": true,
  "message": "Объявление найдено",
  "data": {}
}
```

Ошибки FastAPI возвращаются в поле `detail` с соответствующим HTTP status.

Для защищённых endpoints:

```http
Authorization: Bearer <access_token>
```

## API

Ниже приведена навигационная карта. Точные request/response-схемы всегда доступны в Swagger.

### Авторизация

| Метод | Endpoint | Назначение |
| --- | --- | --- |
| POST | `/auth/register/send-code` | отправить код регистрации |
| POST | `/auth/register/verify-code` | проверить код и получить verification token |
| POST | `/auth/register/complete` | создать аккаунт и получить JWT |
| POST | `/auth/login` | вход по username/телефону и паролю |
| POST | `/auth/login/phone/send-code` | отправить код входа |
| POST | `/auth/login/phone/verify-code` | вход по коду |

SMS-код печатается в stdout и хранится в памяти процесса. Это development-заглушка, не production-интеграция.

### Объявления

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/services` | public | каталог, фильтры и сортировка |
| GET | `/services/mine` | user | все собственные объявления |
| GET | `/services/manage/{id}` | owner | собственное объявление независимо от статуса |
| GET | `/services/{id}` | public/participant | карточка объявления |
| POST | `/services` | user | создать объявление (`multipart/form-data`) |
| PUT | `/services/{id}` | owner | изменить объявление (`multipart/form-data`) |
| DELETE | `/services/{id}` | owner | удалить объявление без активной сделки |
| GET | `/services/{id}/similar` | public | похожие активные объявления |

Фильтры `GET /services`: `q`, `listing_type`, `category_id`, `subcategory_id`, `min_price`, `max_price`, `skip`, `limit`, `sort`.

Сортировки: `newest`, `oldest`, `price_asc`, `price_desc`.

Объявление принимает до 8 изображений. Один файл — до 5 МБ; допустимы JPEG, PNG, WebP и GIF. Расширение, MIME type и сигнатура содержимого проверяются.

### Категории

| Метод | Endpoint | Назначение |
| --- | --- | --- |
| GET | `/categories` | категории с подкатегориями |
| GET | `/categories/{id}/subcategories` | подкатегории категории |

Категории автоматически наполняются базовым набором при старте приложения.

### Профили и отзывы

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| GET | `/users/me` | user | приватный профиль |
| PATCH | `/users/me` | user | обновить профиль |
| POST | `/users/me/avatar` | user | загрузить аватар |
| GET | `/users/{id}` | public | публичный профиль |
| GET | `/users/{id}/services` | public | активные объявления пользователя |
| GET | `/users/{id}/reviews` | public | отзывы о пользователе |
| POST | `/users/{id}/reviews` | participant | отзыв о второй стороне после сделки |
| DELETE | `/users/reviews/{id}` | admin | удалить отзыв |

Отзыв привязан к `response_id`. После завершения заказчик может один раз оценить исполнителя (`review_type=performer`), а исполнитель — заказчика (`review_type=customer`). Рейтинги ролей агрегируются отдельно.

### Отклики и сделки

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| POST | `/services/{id}/responses` | user | отправить отклик |
| GET | `/responses/sent` | user | отправленные отклики |
| GET | `/responses/received` | owner | отклики на собственные объявления |
| PATCH | `/responses/{id}` | participant | изменить допустимый статус |

Статусы: `new`, `accepted`, `work_submitted`, `revision_requested`, `disputed`, `completed`, `cancelled`, `declined`.

Разрешённые действия вычисляются сервером и возвращаются в `ResponseRead`: `can_accept`, `can_submit_work`, `can_confirm`, `can_request_revision`, `can_dispute`, `can_cancel`, `can_review`, `review_left`.

Исполнитель переводит сделку в `work_submitted`. Заказчик принимает результат, возвращает его на доработку с комментарием или открывает спор. Если в течение 72 часов спор не открыт, просроченная работа получает `completed` при следующем обращении к API сделок.

Споры доступны администратору:

| Метод | Endpoint | Назначение |
| --- | --- | --- |
| GET | `/admin/responses/disputed` | список открытых споров |
| PATCH | `/admin/responses/{id}` | завершить, отменить или вернуть на доработку |

### Жалобы

| Метод | Endpoint | Доступ | Назначение |
| --- | --- | --- | --- |
| POST | `/reports` | user | создать жалобу |
| GET | `/admin/reports` | admin | список жалоб |
| PATCH | `/admin/reports/{id}` | admin | изменить статус |

Типы целей: `service`, `user`, `review`. Причины: `spam`, `fraud`, `abuse`, `illegal`, `wrong_info`, `other`.

Для `other` требуется комментарий минимум из 10 символов. Дубликат уже рассматриваемой жалобы блокируется.

### Администрирование

Префикс `/admin` включает управление пользователями, объявлениями, категориями, подкатегориями, отзывами и жалобами. Все endpoints требуют `is_admin = true`.

## Модели

| Модель | Таблица | Назначение |
| --- | --- | --- |
| `User` | `users` | аккаунты и роли |
| `Service` | `services` | предложение или запрос услуги |
| `Category` | `categories` | категория |
| `Subcategory` | `subcategories` | подкатегория |
| `ServiceImage` | `service_images` | изображения объявления |
| `ServiceResponse` | `service_responses` | отклик и минимальная сущность сделки |
| `Review` | `reviews` | отзыв, привязанный к сделке |
| `Report` | `reports` | жалоба модератору |

## Миграции

```bash
alembic current
alembic upgrade head
alembic revision --autogenerate -m "change description"
alembic downgrade -1
```

Текущая цепочка:

1. `202606170001` — начальная расширенная схема;
2. `202606290001` — отклики, жалобы и privacy-поля;
3. `202606290002` — повторные сделки, nullable-цена и структурированные жалобы.
4. `202606300001` — приёмка заказчиком, споры, автозавершение и двусторонняя репутация.
5. `202607030001` — индексы производительности.
6. `202607090001` — PostgreSQL-совместимые check constraints.

Head: `202607090001`.

## Структура

```text
├── alembic/       # env и версии миграций
├── core/          # config, JWT, phone normalization
├── models/        # SQLAlchemy entities
├── routers/       # FastAPI routers
├── schemas/       # Pydantic DTO
├── services/      # SMS и uploads
├── database.py    # engine, session, seed категорий
├── dependencies.py
└── main.py
```

## Проверка

```bash
python -m compileall -q core models routers schemas services main.py dependencies.py database.py
python -m unittest discover -s tests
alembic current
```

Быстрые unit-тесты используют in-memory SQLite только как тестовый движок. Основная база приложения — PostgreSQL; миграции проверяйте через `alembic upgrade head` на PostgreSQL.
