# Ykt.Услуги

Локальная площадка объявлений услуг для Якутска: пользователи публикуют предложения или задачи, откликаются, выбирают исполнителя, принимают результат работы и формируют двустороннюю репутацию.

Проект состоит из независимых приложений:

| Часть | Каталог | Технологии | Локальный адрес |
| --- | --- | --- | --- |
| Web-клиент | `ykt_uslugi-front` | React 19, TypeScript, Vite 8, Tailwind CSS 4 | `http://localhost:5173` |
| API | `ykt_uslugi-back` | FastAPI, SQLAlchemy 2, Alembic, PostgreSQL | `http://localhost:8000` |

## Возможности

- регистрация и вход по паролю или SMS-коду;
- JWT-авторизация и роли пользователя/администратора;
- объявления двух типов: «Оказываю услугу» и «Ищу услугу»;
- категории, подкатегории, поиск, фильтры и сортировка;
- фиксированная цена, цена «от» или договорная цена без обязательной суммы;
- до 8 изображений объявления и аватар пользователя;
- повторные сделки между теми же пользователями;
- двухэтапное завершение: исполнитель передаёт результат, заказчик принимает его;
- доработка, спор с решением модератора и автоприёмка через 72 часа;
- раздельные отзывы и рейтинги исполнителя и заказчика;
- структурированные жалобы и интерфейс модератора;
- адаптивный marketplace-интерфейс для desktop и mobile.

## Быстрый запуск через Docker

Это рекомендуемый способ локального запуска. Требуются Docker Desktop либо Docker Engine с Compose v2.

```bash
cp .env.example .env
docker compose up --build -d
```

После запуска:

- приложение: `http://localhost:5173`;
- API напрямую: `http://localhost:8000`;
- Swagger: `http://localhost:8000/docs`.

Миграции Alembic применяются автоматически перед запуском backend. Код development-SMS можно посмотреть так:

```bash
docker compose logs -f backend
```

Полезные команды:

```bash
# Состояние контейнеров
docker compose ps

# Логи всех сервисов
docker compose logs -f

# Пересобрать после изменения зависимостей или frontend
docker compose up --build -d

# Остановить, сохранив базу и изображения
docker compose down

# Проверить миграцию
docker compose exec backend alembic current
```

PostgreSQL хранит данные в named volume `ykt-uslugi_postgres_data`, изображения — в `ykt-uslugi_backend_uploads`. Оба volume сохраняются после `docker compose down`. Команда `docker compose down -v` удалит volumes вместе со всеми локальными данными.

Docker использует собственную PostgreSQL-базу в volume и не подхватывает автоматически внешние локальные базы.

### Как устроены контейнеры

```text
Browser :5173
      │
      ▼
Frontend (Nginx + React SPA)
      │ /api/*
      ▼
Backend (FastAPI :8000)
      │
      ▼
PostgreSQL (db :5432)

Backend uploads:
Volume /data/uploads
```

Nginx отдаёт SPA и проксирует `/api/*` во внутренний сервис `backend`. Поэтому запросы браузера являются same-origin и для обычной работы Docker-версии CORS не требуется.

Порты, секрет и TTL настраиваются в корневом `.env`:

```env
FRONTEND_PORT=5173
BACKEND_PORT=8000
POSTGRES_DB=ykt_uslugi
POSTGRES_USER=ykt_uslugi
POSTGRES_PASSWORD=ykt_uslugi
ENVIRONMENT=development
SECRET_KEY=replace-with-a-long-random-secret
```

## Запуск без Docker

### 1. Backend

Требуется Python 3.12+.

```bash
cd ykt_uslugi-back
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql+asyncpg://ykt_uslugi:ykt_uslugi@localhost:5432/ykt_uslugi
alembic upgrade head
uvicorn main:app --reload
```

Backend необходимо запускать из каталога `ykt_uslugi-back`: значение `uploads` является относительным. PostgreSQL должен быть запущен и доступен по `DATABASE_URL`.

После запуска доступны:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 2. Frontend

Требуется Node.js 20.19+ и npm.

```bash
cd ykt_uslugi-front
npm install
cp .env.example .env
npm run dev
```

Откройте `http://localhost:5173`.

### 3. Первый вход

В текущей development-реализации SMS не отправляется внешним провайдером. Код выводится в терминал backend:

```text
SMS был отправлен на номер +79990000000. Код: 1234
```

Коды и подтверждённые номера хранятся в памяти процесса. После перезапуска backend они сбрасываются.

## Конфигурация

### Backend

Переменные читаются из окружения. Файл `.env.example` служит шаблоном, но сам Python-код не загружает `.env` автоматически: экспортируйте переменные в shell или передавайте их процессу запуска, если значения отличаются от стандартных.

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | Режим приложения |
| `SECRET_KEY` | development-ключ | Подпись JWT; в production обязателен собственный секрет |
| `DATABASE_URL` | `postgresql+asyncpg://ykt_uslugi:ykt_uslugi@localhost:5432/ykt_uslugi` | async URL SQLAlchemy |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Срок жизни access token |
| `SMS_CODE_TTL_SECONDS` | `300` | Срок действия SMS-кода |
| `SMS_RESEND_COOLDOWN_SECONDS` | `60` | Интервал повторной отправки |
| `VERIFICATION_TOKEN_EXPIRE_MINUTES` | `15` | Срок подтверждения номера |
| `UPLOAD_DIR` | `uploads` | Каталог изображений |
| `CORS_ORIGINS` | `http://localhost:5173` | Разрешённые origins через запятую |

Пример запуска с переменными:

```bash
ENVIRONMENT=development \
SECRET_KEY=local-secret \
CORS_ORIGINS=http://localhost:5173 \
DATABASE_URL=postgresql+asyncpg://ykt_uslugi:ykt_uslugi@localhost:5432/ykt_uslugi \
uvicorn main:app --reload
```

### Frontend

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | Базовый URL API без завершающего `/` |

JWT хранится в `localStorage` под ключом `access_token` и передаётся как `Authorization: Bearer <token>`.

## Модель объявления и сделки

### Объявление

`listing_type`:

- `offer` — автор предлагает услугу;
- `request` — автор ищет исполнителя.

`price_type`:

- `fixed` — точная цена больше нуля;
- `from` — минимальная цена больше нуля;
- `negotiable` — сумма не передаётся, `price = null`.

`status`:

- `active` — опубликовано;
- `hidden` — скрыто владельцем;
- `moderation` — доступно только для решения администратора;
- `closed` — закрыто.

### Роли сделки

| Тип объявления | Заказчик | Исполнитель | Кто принимает отклик | Кто передаёт результат | Кто подтверждает |
| --- | --- | --- | --- | --- | --- |
| `request` | автор | откликнувшийся | автор-заказчик | выбранный исполнитель | автор-заказчик |
| `offer` | откликнувшийся | автор | автор-исполнитель | автор-исполнитель | откликнувшийся заказчик |

Переходы статусов:

```text
new ──► accepted ──► work_submitted ──► completed
 │          │               │
 ├──► declined              ├──► revision_requested ──► work_submitted
 └──────────► cancelled     └──► disputed ──► решение модератора
```

- второй активный отклик той же пары запрещён;
- после `completed`, `cancelled` или `declined` можно начать новую сделку по тому же объявлению;
- для запроса услуги выбор исполнителя переводит остальные новые отклики в `declined`;
- исполнитель переводит работу в `work_submitted`, но не может принять её за заказчика;
- заказчик принимает результат, возвращает его на доработку или открывает спор;
- без спора результат автоматически принимается через 72 часа при следующем обращении к API сделок;
- после `completed` заказчик оценивает исполнителя, а исполнитель — заказчика;
- каждый участник может оставить не более одного отзыва на сделку;
- объявление с принятой активной сделкой нельзя удалить.

Подробнее о продуктовых решениях: [PRODUCT_AUDIT.md](PRODUCT_AUDIT.md).

## Основные маршруты frontend

| URL | Назначение | Доступ |
| --- | --- | --- |
| `/` | каталог и поиск | публичный |
| `/services/:id` | страница объявления | публичный; скрытое доступно участникам |
| `/register`, `/login` | авторизация | публичный |
| `/adadder` | создание объявления | авторизованный |
| `/services/:id/edit` | редактор объявления | владелец |
| `/my-ads` | управление объявлениями | авторизованный |
| `/responses` | активные сделки и история | авторизованный |
| `/profile` | собственный профиль | авторизованный |
| `/users/:id` | публичный профиль | публичный |
| `/admin` | модерация | администратор |
| `/terms`, `/privacy` | юридические страницы | публичный |

## Структура репозитория

```text
Ykt_Uslugi/
├── README.md
├── PRODUCT_AUDIT.md
├── docker-compose.yml
├── .env.example
├── ykt_uslugi-front/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   │   ├── api/          # API-клиент, типы и токен
│   │   ├── components/   # Header, Footer, Modal и guards
│   │   ├── pages/        # страницы приложения
│   │   ├── App.tsx       # маршрутизация
│   │   └── index.css     # design tokens и общие компоненты
│   └── package.json
└── ykt_uslugi-back/
    ├── alembic/          # миграции БД
    ├── core/             # конфигурация, JWT, телефоны
    ├── models/           # SQLAlchemy-модели
    ├── routers/          # HTTP endpoints
    ├── schemas/          # Pydantic-контракты
    ├── services/         # изображения и SMS
    ├── database.py
    └── main.py
```

## Проверка изменений

Frontend:

```bash
cd ykt_uslugi-front
npm run lint
npm run build
```

Backend:

```bash
cd ykt_uslugi-back
source venv/bin/activate
python -m compileall -q core models routers schemas services main.py dependencies.py database.py
python -m unittest discover -s tests
alembic current
```

Перед релизом дополнительно рекомендуется покрыть интеграционными тестами авторизацию, права доступа, отзывы и жалобы на PostgreSQL.

## Миграции

```bash
cd ykt_uslugi-back
alembic current
alembic upgrade head
alembic revision --autogenerate -m "change description"
alembic downgrade -1
```

Актуальная head-ревизия: `202607090001`.

Не редактируйте структуру PostgreSQL вручную и не используйте `Base.metadata.create_all()` вместо Alembic.

## Ограничения текущей версии

- SMS-провайдер не подключён; используется терминальный development-адаптер.
- Локальная папка загрузок подходит для разработки, но не для горизонтального production-развёртывания.
- Нет встроенного чата, платежей, уведомлений и арбитража.
- Нет e2e-тестов.

Для production понадобятся объектное хранилище, реальный SMS-провайдер, rate limiting, мониторинг, резервное копирование и безопасное хранение секретов.

Текущий Compose предназначен прежде всего для локального запуска и одного экземпляра backend. Для production необходимо настроить TLS, собственный `SECRET_KEY`, внешний reverse proxy, PostgreSQL и резервное копирование persistent data.
