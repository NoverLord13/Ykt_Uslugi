# Ykt.Услуги

Локальная площадка объявлений услуг для Якутска: пользователи публикуют предложения или задачи, откликаются, выбирают исполнителя, фиксируют завершение сделки и формируют репутацию заказчиков.

Проект состоит из независимых приложений:

| Часть | Каталог | Технологии | Локальный адрес |
| --- | --- | --- | --- |
| Web-клиент | `ykt_usligi-front` | React 19, TypeScript, Vite 8, Tailwind CSS 4 | `http://localhost:5173` |
| API | `ykt_uslugi-back` | FastAPI, SQLAlchemy 2, Alembic, SQLite | `http://localhost:8000` |

## Возможности

- регистрация и вход по паролю или SMS-коду;
- JWT-авторизация и роли пользователя/администратора;
- объявления двух типов: «Оказываю услугу» и «Ищу услугу»;
- категории, подкатегории, поиск, фильтры и сортировка;
- фиксированная цена, цена «от» или договорная цена без обязательной суммы;
- до 8 изображений объявления и аватар пользователя;
- повторные сделки между теми же пользователями;
- жизненный цикл отклика: новый, принят, завершён, отменён или отклонён;
- отзывы только после подтверждённой сделки;
- структурированные жалобы и интерфейс модератора;
- адаптивный marketplace-интерфейс для desktop и mobile.

## Быстрый запуск

### 1. Backend

Требуется Python 3.12+.

```bash
cd ykt_uslugi-back
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

Backend необходимо запускать из каталога `ykt_uslugi-back`: значения `sqlite:///./app.db` и `uploads` являются относительными.

После запуска доступны:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 2. Frontend

Требуется Node.js 20.19+ и npm.

```bash
cd ykt_usligi-front
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
| `DATABASE_URL` | `sqlite:///./app.db` | URL SQLAlchemy |
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

| Тип объявления | Заказчик | Исполнитель | Кто принимает отклик | Кто завершает | Кто оставляет отзыв |
| --- | --- | --- | --- | --- | --- |
| `request` | автор | откликнувшийся | автор | выбранный исполнитель | исполнитель о заказчике |
| `offer` | откликнувшийся | автор | автор | автор-исполнитель | исполнитель о заказчике |

Переходы статусов:

```text
new ──► accepted ──► completed
 │          │
 ├──► declined
 └──────────► cancelled
```

- второй активный отклик той же пары запрещён;
- после `completed`, `cancelled` или `declined` можно начать новую сделку по тому же объявлению;
- для запроса услуги выбор исполнителя переводит остальные новые отклики в `declined`;
- завершить сделку может только исполнитель;
- отзыв доступен исполнителю один раз после завершения и адресован заказчику;
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
├── ykt_usligi-front/
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
cd ykt_usligi-front
npm run lint
npm run build
```

Backend:

```bash
cd ykt_uslugi-back
source venv/bin/activate
python -m compileall -q core models routers schemas services main.py dependencies.py database.py
alembic current
```

Автоматизированный test suite пока не добавлен. Перед релизом рекомендуется покрыть интеграционными тестами авторизацию, переходы сделки, права доступа, отзывы и жалобы.

## Миграции

```bash
cd ykt_uslugi-back
alembic current
alembic upgrade head
alembic revision --autogenerate -m "change description"
alembic downgrade -1
```

Актуальная head-ревизия: `202606290002`.

Не редактируйте структуру SQLite вручную и не используйте `Base.metadata.create_all()` вместо Alembic.

## Ограничения текущей версии

- SMS-провайдер не подключён; используется терминальный development-адаптер.
- SQLite и локальная папка загрузок подходят для разработки, но не для горизонтального production-развёртывания.
- Нет встроенного чата, платежей, уведомлений и арбитража.
- Нет пагинации истории откликов и административных списков.
- Нет автоматизированных unit/e2e-тестов.

Для production понадобятся PostgreSQL, объектное хранилище, реальный SMS-провайдер, rate limiting, мониторинг, резервное копирование и безопасное хранение секретов.
