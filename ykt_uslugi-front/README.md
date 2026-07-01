# Ykt.Услуги Frontend

React-клиент локальной площадки объявлений услуг. Общая документация проекта и полный сценарий запуска находятся в [корневом README](../README.md).

## Стек

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- Tailwind CSS 4
- Axios

## Запуск

Требуется Node.js 20.19+.

```bash
npm install
cp .env.example .env
npm run dev
```

Приложение откроется на `http://localhost:5173`.

## Docker

Из корня репозитория frontend запускается вместе с backend:

```bash
docker compose up --build -d
```

Образ собирается в два этапа: Node.js выполняет TypeScript/Vite build, затем статические файлы копируются в Nginx. В Docker-сборке `VITE_API_URL=/api`, а `nginx.conf` проксирует `/api/*` в контейнер FastAPI и поддерживает fallback React Router на `index.html`.

## Переменная окружения

```env
VITE_API_URL=http://localhost:8000
```

Если переменная не задана, используется `http://localhost:8000`.

После изменения `.env` перезапустите Vite.

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run dev` | development-сервер с HMR |
| `npm run build` | TypeScript-проверка и production-сборка |
| `npm run lint` | ESLint |
| `npm run preview` | локальный просмотр содержимого `dist` |

## Архитектура

```text
src/
├── api/
│   ├── Api.ts       # основной Axios-клиент и доменные типы
│   ├── auth.ts      # регистрация, вход и access token
│   └── client.ts    # fetch-обёртка auth endpoints
├── components/
│   ├── FeedbackModals.tsx
│   ├── Modal.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── RequireAuth.tsx
├── pages/           # route-компоненты
├── App.tsx          # таблица маршрутов
├── index.css        # Tailwind, design tokens, общие UI-классы
└── main.tsx
```

### API и авторизация

- API URL берётся из `VITE_API_URL`.
- JWT хранится в `localStorage` под ключом `access_token`.
- Защищённые Axios-запросы получают заголовок `Authorization: Bearer <token>`.
- `RequireAuth` перенаправляет гостя на страницу входа.
- Серверные проверки являются источником истины; скрытие кнопки в UI не заменяет авторизацию API.

### Design system

Основные CSS tokens находятся в `src/index.css`:

- `--brand` — кораллово-оранжевый основной action;
- `--accent` — синий цвет доверия и аватаров;
- `--ink`, `--muted` — основной и вторичный текст;
- `--line`, `--page`, `--card` — поверхности интерфейса;
- `--danger`, `--mint` — ошибки и успешные статусы.

Повторно используемые классы: `page-shell`, `surface`, `button-primary`, `button-secondary`, `field`, `status-pill`, `empty-state` и modal-классы.

## Проверка перед коммитом

```bash
npm run lint
npm run build
```

В проекте пока нет frontend unit/e2e test runner.
