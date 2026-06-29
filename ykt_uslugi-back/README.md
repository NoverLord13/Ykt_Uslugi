# Ykt Uslugi Backend

Backend для сервиса объявлений услуг на FastAPI.

## Стек

- FastAPI
- SQLAlchemy
- SQLite по умолчанию
- Alembic для миграций БД
- JWT-авторизация
- SMS-коды для регистрации и входа
- Загрузка файлов в локальную папку `uploads`

## Быстрый Запуск

Перейти в папку бэкенда:

```bash
cd ykt_uslugi-back
```

Установить зависимости:

```bash
./venv/bin/pip install -r requirements.txt
```

Применить миграции:

```bash
./venv/bin/alembic upgrade head
```

Запустить сервер:

```bash
./venv/bin/uvicorn main:app --reload
```

API будет доступен по адресу:

```text
http://localhost:8000
```

Swagger-документация FastAPI:

```text
http://localhost:8000/docs
```

## Переменные Окружения

Настройки берутся из `core/config.py`.

| Переменная | Значение по умолчанию | Назначение |
| --- | --- | --- |
| `SECRET_KEY` | `dev-secret-key-change-in-production` | Секрет для JWT |
| `DATABASE_URL` | `sqlite:///./app.db` | URL базы данных |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Время жизни access token |
| `SMS_CODE_TTL_SECONDS` | `300` | Время жизни SMS-кода |
| `SMS_RESEND_COOLDOWN_SECONDS` | `60` | Пауза между отправками SMS |
| `VERIFICATION_TOKEN_EXPIRE_MINUTES` | `15` | Время жизни токена подтверждения телефона |
| `UPLOAD_DIR` | `uploads` | Папка для загруженных файлов |

## Миграции БД

В проекте используется Alembic. Автоматическое создание таблиц через `Base.metadata.create_all()` отключено.

Проверить текущую ревизию:

```bash
./venv/bin/alembic current
```

Применить все миграции:

```bash
./venv/bin/alembic upgrade head
```

Создать новую миграцию после изменения моделей:

```bash
./venv/bin/alembic revision --autogenerate -m "migration message"
```

Откатить последнюю миграцию:

```bash
./venv/bin/alembic downgrade -1
```

Текущие миграции:

- `202606170001_expand_backend_schema.py`
- `202606290001_add_responses_reports_and_privacy.py`

Вторая миграция добавляет отклики/сделки, жалобы, привязку отзывов к завершённым сделкам, Telegram username и фиксацию принятия юридических условий.

Она добавляет категории, подкатегории, несколько фото, отзывы, профиль пользователя и расширенные поля объявления.

## Основные Сущности

### User

Пользователь сервиса.

Основные поля:

- `id`
- `username`
- `phone_number`
- `hashed_password`
- `display_name`
- `bio`
- `avatar_url`
- `location`
- `is_active`
- `is_admin`
- `created_at`

### Service

Объявление. Исторически модель называется `Service`, но фактически это объявление услуги или запроса услуги.

Основные поля:

- `id`
- `owner_id`
- `title`
- `description`
- `price`
- `listing_type`
- `category_id`
- `subcategory_id`
- `location`
- `price_type`
- `status`
- `contact_phone`
- `image_url`
- `is_active`
- `created_at`
- `updated_at`

Значения `listing_type`:

- `offer` - оказываю услугу
- `request` - ищу услугу

Значения `price_type`:

- `fixed` - фиксированная цена
- `from` - цена от указанной суммы
- `negotiable` - договорная цена

Значения `status`:

- `active` - опубликовано
- `hidden` - скрыто
- `moderation` - на модерации
- `closed` - закрыто

### Category

Основная категория объявления.

Поля:

- `id`
- `name`
- `slug`
- `created_at`

### Subcategory

Подкатегория внутри основной категории.

Поля:

- `id`
- `category_id`
- `name`
- `slug`
- `created_at`

### ServiceImage

Фото объявления.

Поля:

- `id`
- `service_id`
- `url`
- `position`
- `created_at`

Поле `Service.image_url` сохранено для совместимости с текущим фронтом. При загрузке нескольких фото туда записывается первое фото.

### Review

Отзыв пользователя.

Поля:

- `id`
- `author_id`
- `target_user_id`
- `service_id`
- `rating`
- `text`
- `created_at`

Ограничения:

- `rating` от 1 до 5
- нельзя оставить отзыв самому себе
- один автор может оставить только один отзыв одному пользователю
- если указан `service_id`, объявление должно принадлежать пользователю, которому оставляют отзыв

## Авторизация

Авторизация работает через Bearer JWT.

Заголовок для защищенных endpoints:

```http
Authorization: Bearer <access_token>
```

Токен выдается после завершения регистрации или входа.

## API

Все ответы обернуты в общий формат:

```json
{
  "success": true,
  "message": "Описание результата",
  "data": {}
}
```

### Auth

#### POST `/auth/register/send-code`

Отправляет SMS-код для регистрации.

Тело:

```json
{
  "phone": "+79990000000"
}
```

#### POST `/auth/register/verify-code`

Проверяет SMS-код и возвращает `verification_token`.

Тело:

```json
{
  "phone": "+79990000000",
  "code": "1234"
}
```

#### POST `/auth/register/complete`

Завершает регистрацию.

Тело:

```json
{
  "verification_token": "token",
  "username": "user_name",
  "password": "password123",
  "accept_terms": true
}
```

#### POST `/auth/login`

Вход по username или телефону и паролю.

Тело:

```json
{
  "login": "user_name",
  "password": "password123"
}
```

#### POST `/auth/login/phone/send-code`

Отправляет SMS-код для входа по телефону.

#### POST `/auth/login/phone/verify-code`

Проверяет SMS-код и возвращает access token.

### Services

#### GET `/services`

Возвращает список активных объявлений.

Query-параметры:

| Параметр | Тип | Описание |
| --- | --- | --- |
| `q` | string | Поиск по названию и описанию |
| `listing_type` | `offer` или `request` | Тип объявления |
| `category_id` | int | Фильтр по категории |
| `subcategory_id` | int | Фильтр по подкатегории |
| `min_price` | decimal | Минимальная цена |
| `max_price` | decimal | Максимальная цена |
| `skip` | int | Смещение для пагинации |
| `limit` | int | Количество записей, максимум 100 |
| `sort` | string | `newest`, `oldest`, `price_asc`, `price_desc` |

Пример:

```text
GET /services?q=ремонт&listing_type=offer&category_id=1&skip=0&limit=20&sort=newest
```

### Отклики и сделки

- `POST /services/{service_id}/responses` — отправить отклик;
- `GET /responses/sent` — отправленные отклики;
- `GET /responses/received` — отклики на свои объявления;
- `PATCH /responses/{response_id}` — принять, завершить или отменить отклик.

Статусы: `new`, `accepted`, `completed`, `cancelled`. Отзыв можно создать только между участниками завершённой сделки, передав `response_id`.

### Жалобы

- `POST /reports` — пожаловаться на объявление, пользователя или отзыв;
- `GET /admin/reports` — очередь жалоб для администратора;
- `PATCH /admin/reports/{report_id}` — изменить статус жалобы.

### Приватность и файлы

Публичный профиль не возвращает телефон и административные флаги. Загружаемые изображения ограничены 5 МБ, проверяются по MIME, расширению и сигнатуре файла. При замене или удалении сущности локальные файлы удаляются.

#### GET `/services/mine`

Возвращает объявления текущего пользователя.

Требует авторизацию.

#### GET `/services/{service_id}`

Возвращает одно объявление.

#### POST `/services`

Создает объявление.

Требует авторизацию.

Формат: `multipart/form-data`.

Поля:

| Поле | Тип | Обязательное | Описание |
| --- | --- | --- | --- |
| `title` | string | да | Название |
| `description` | string | да | Описание |
| `price` | decimal | да | Цена |
| `listing_type` | string | нет | `offer` или `request`, по умолчанию `offer` |
| `category_id` | int | нет | ID категории |
| `subcategory_id` | int | нет | ID подкатегории |
| `location` | string | нет | Локация |
| `price_type` | string | нет | `fixed`, `from`, `negotiable` |
| `contact_phone` | string | нет | Контактный телефон |
| `image` | file | нет | Одно фото для старого фронта |
| `images` | file[] | нет | Несколько фото, максимум 8 |

Если переданы и `image`, и `images`, файл из `image` будет добавлен первым.

#### PUT `/services/{service_id}`

Обновляет объявление.

Требует авторизацию. Можно редактировать только свои объявления.

Формат: `multipart/form-data`.

Поддерживает обновление:

- `title`
- `description`
- `price`
- `listing_type`
- `category_id`
- `subcategory_id`
- `location`
- `price_type`
- `status`
- `contact_phone`
- `image`
- `images`

Если переданы новые фото, старый набор фото объявления заменяется новым.

#### DELETE `/services/{service_id}`

Удаляет объявление.

Требует авторизацию. Можно удалять только свои объявления.

#### GET `/services/{service_id}/similar`

Возвращает похожие объявления.

Query-параметры:

| Параметр | Тип | Описание |
| --- | --- | --- |
| `limit` | int | Количество объявлений, максимум 20 |

Логика:

- исключает текущее объявление
- ищет активные объявления того же `listing_type`
- сначала совпадение по подкатегории
- затем совпадение по категории

### Categories

#### GET `/categories`

Возвращает категории вместе с подкатегориями.

#### GET `/categories/{category_id}/subcategories`

Возвращает подкатегории конкретной категории.

### Users

#### GET `/users/me`

Возвращает профиль текущего пользователя.

Требует авторизацию.

#### PATCH `/users/me`

Обновляет профиль текущего пользователя.

Требует авторизацию.

Тело:

```json
{
  "display_name": "Иван Иванов",
  "bio": "Занимаюсь ремонтом квартир",
  "location": "Якутск"
}
```

#### POST `/users/me/avatar`

Загружает аватар текущего пользователя.

Требует авторизацию.

Формат: `multipart/form-data`.

Поле:

- `avatar` - файл изображения

#### GET `/users/{user_id}`

Возвращает публичный профиль пользователя.

В ответ добавляются:

- `rating_avg`
- `reviews_count`

#### GET `/users/{user_id}/services`

Возвращает активные объявления пользователя.

#### GET `/users/{user_id}/reviews`

Возвращает отзывы пользователя.

#### POST `/users/{user_id}/reviews`

Создает отзыв пользователю.

Требует авторизацию.

Тело:

```json
{
  "service_id": 1,
  "rating": 5,
  "text": "Отличная работа"
}
```

`service_id` можно не передавать.

#### DELETE `/users/reviews/{review_id}`

Удаляет отзыв.

Доступно автору отзыва или администратору.

### Admin

Все endpoints `/admin/*` требуют пользователя с `is_admin = true`.

#### GET `/admin/users`

Список пользователей.

#### PATCH `/admin/users/{user_id}`

Обновляет статус пользователя.

Тело:

```json
{
  "is_active": true,
  "is_admin": false
}
```

#### GET `/admin/services`

Список всех объявлений, включая неактивные.

#### PATCH `/admin/services/{service_id}`

Модерация объявления.

Тело:

```json
{
  "is_active": true,
  "status": "active"
}
```

#### DELETE `/admin/services/{service_id}`

Удаляет любое объявление.

#### GET `/admin/categories`

Список категорий.

#### POST `/admin/categories`

Создает категорию.

Тело:

```json
{
  "name": "Ремонт",
  "slug": "remont"
}
```

#### PATCH `/admin/categories/{category_id}`

Обновляет категорию.

#### DELETE `/admin/categories/{category_id}`

Удаляет категорию, если она не используется в объявлениях.

#### POST `/admin/subcategories`

Создает подкатегорию.

Тело:

```json
{
  "category_id": 1,
  "name": "Сантехника",
  "slug": "santehnika"
}
```

#### PATCH `/admin/subcategories/{subcategory_id}`

Обновляет подкатегорию.

#### DELETE `/admin/subcategories/{subcategory_id}`

Удаляет подкатегорию, если она не используется в объявлениях.

#### GET `/admin/reviews`

Список отзывов.

#### DELETE `/admin/reviews/{review_id}`

Удаляет отзыв.

## Загрузка Файлов

Файлы сохраняются в папку из `UPLOAD_DIR`, по умолчанию `uploads`.

Разрешенные форматы:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.gif`

Максимальный размер файла:

- 5 МБ

Загруженные файлы доступны через:

```text
/uploads/<filename>
```

## Сидинг

При старте приложения выполняется сидинг категорий и подкатегорий через `seed_categories()`.

Сидинг не удаляет существующие данные и добавляет только отсутствующие записи.

## Проверка Кода

Компиляция исходников:

```bash
./venv/bin/python -m compileall database.py main.py dependencies.py core models routers schemas services alembic
```

Проверка импорта приложения:

```bash
./venv/bin/python -c "import main; print('import ok')"
```

## Важные Замечания Для Фронта

- Старое поле `image_url` осталось, но теперь есть полноценный массив `images`.
- `GET /services` по-прежнему возвращает список в `data`, чтобы не ломать текущий фронт.
- Для фильтров фронту нужно использовать query-параметры `q`, `listing_type`, `category_id`, `subcategory_id`, `min_price`, `max_price`, `sort`, `skip`, `limit`.
- Для создания объявления лучше отправлять `multipart/form-data` с `images` как массивом файлов.
- Для выбора категории сначала получить `GET /categories`, затем отправлять `category_id` и `subcategory_id` при создании объявления.
