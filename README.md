# TruCare Frontend

React SPA для цифрового дневника лечения Truqap.
Стек: Vite + React 19 + TypeScript + TanStack Router + Tailwind CSS v4.

---

## Стек

| Слой | Технология |
|------|------------|
| Фреймворк | React 19 + Vite |
| Роутинг | TanStack Router (file-based) |
| State | Zustand (patient auth), TanStack Query (server state) |
| UI | Radix UI + Tailwind CSS v4 + shadcn/ui |
| Формы | react-hook-form + zod |
| Иконки | lucide-react |
| Дата | date-fns |
| Графики | recharts |

---

## Скрипты

```bash
npm run dev        # dev-сервер (http://localhost:5173)
npm run build      # продакшн-сборка
npm run preview    # превью сборки
npm run lint       # ESLint
npm run format     # Prettier
```

---

## Переменные окружения

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
```

Если не задана — используется `http://localhost:8000/api/v1` по умолчанию.

> **Важно:** `APP_DOMAIN` задаётся **только на бэкенде** (`backend/.env`). Он используется для формирования WebOTP-строки в SMS. Если не задан — домен определяется автоматически из `HTTP_ORIGIN` заголовка запроса (совпадает с доменом фронтенда).

---

## Структура

```
frontend/
├── src/
│   ├── routes/                      # file-based роутинг TanStack Router
│   │   ├── __root.tsx               # корневой layout
│   │   ├── index.tsx                # главная (логин / регистрация / демо-дневник)
│   │   ├── register.tsx             # регистрация нового пациента
│   │   ├── verify-otp.tsx           # верификация OTP (телефон/email)
│   │   ├── onboarding.tsx           # онбординг
│   │   ├── instructions.tsx         # инструкции
│   │   ├── diary.tsx                # дневник пациента
│   │   ├── diary-demo.tsx           # демо-дневник (анонимный доступ)
│   │   ├── consent.tsx              # согласие
│   │   ├── privacy-policy.tsx       # политика конфиденциальности
│   │   ├── terms-of-use.tsx         # условия использования
│   │   └── admin*.tsx               # админ-панель
│   ├── components/
│   │   ├── LoginDialog.tsx          # модалка входа (телефон/email + WebOTP)
│   │   ├── OtpInput.tsx             # 6-полный ввод OTP с autoFill
│   │   ├── PageShell.tsx            # обёртка страниц (header/footer)
│   │   ├── ResetCycleModal.tsx      # сброс цикла лечения
│   │   ├── ExistingPatientDialog.tsx
│   │   ├── PatientAuthMenu.tsx      # меню авторизованного пациента
│   │   ├── admin/
│   │   │   ├── AdminLoginModal.tsx  # кастомный login-модал (без close button)
│   │   │   ├── AdminSidebar.tsx     # боковая навигация админа
│   │   │   └── AdminAuthMenu.tsx
│   │   └── diary/
│   │       ├── DayCard.tsx          # карточка дня в календаре
│   │       └── WeekGrid.tsx         # сетка 2 недель
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts            # real HTTP client (fetch + JWT)
│   │   │   ├── index.ts             # переключатель mock/real
│   │   │   ├── mock.ts              # mock-данные для разработки
│   │   │   └── types.ts             # TypeScript типы API
│   │   ├── adminAuth.ts             # beforeLoad guard для админ-роутов
│   │   ├── calendar.ts              # генерация двухнедельной сетки
│   │   ├── mask.ts                  # маскировка PII (телефон/email)
│   │   ├── validation.ts            # Zod-схемы (phone, email, register)
│   │   ├── error-page.ts            # ErrorBoundary
│   │   └── utils.ts                 # cn() и прочие утилиты
│   ├── state/
│   │   ├── patientAuthStore.ts      # Zustand: статус авторизации пациента
│   │   ├── onboardingStore.ts       # данные онбординга
│   │   └── diaryStore.ts            # состояние дневника (anchor date)
│   └── styles.css                   # глобальные стили + Tailwind
├── docs/api/                        # контракт с бэкендом
│   ├── README.md                    # общая документация API
│   ├── openapi.yaml                 # OpenAPI 3.1 схема
│   ├── schema.sql                   # MariaDB schema
│   └── seed.sql                     # стартовые данные
├── package.json
├── vite.config.ts
├── tsconfig.json
└── AGENTS.md
```

---

## Роутинг

| URL | Компонент | Описание |
|-----|-----------|----------|
| `/` | `index.tsx` | Главная: вход, регистрация, демо-дневник |
| `/register` | `register.tsx` | Регистрация (OTP → онбординг) |
| `/verify-otp` | `verify-otp.tsx` | Верификация OTP (автопереход с /register) |
| `/onboarding` | `onboarding.tsx` | Онбординг |
| `/instructions` | `instructions.tsx` | Инструкции по приему |
| `/diary` | `diary.tsx` | Дневник пациента (auth required) |
| `/diary-demo` | `diary-demo.tsx` | Демо-дневник (без авторизации) |
| `/consent` | `consent.tsx` | Форма согласия |
| `/privacy-policy` | `privacy-policy.tsx` | Политика конфиденциальности |
| `/terms-of-use` | `terms-of-use.tsx` | Условия использования |
| `/admin` | `admin.tsx` | Админ-панель (dashboard + layout) |
| `/admin/login` | `admin.login.tsx` | Страница логина админа |
| `/admin/patients` | `admin.patients.tsx` | Список пациентов |
| `/admin/notifications` | `admin.notifications.tsx` | Лог уведомлений |
| `/admin/incidents` | `admin.incidents.tsx` | Лог инцидентов |
| `/admin/sms-templates` | `admin.sms-templates.tsx` | SMS-шаблоны |
| `/admin/email-templates` | `admin.email-templates.tsx` | Email-шаблоны |
| `/admin/sms-settings` | `admin.sms-settings.tsx` | Настройки SMS |
| `/admin/smtp-settings` | `admin.smtp-settings.tsx` | Настройки SMTP |
| `/admin/settings` | `admin.settings.tsx` | Настройки API (mock/real + base URL) |

---

## Аутентификация

### Пациент

1. Ввод телефона или email → `POST /auth/otp/request` → SMS/email с 6-значным кодом.
2. Ввод кода → `POST /auth/otp/verify` → JWT (`trucare.session` в `localStorage`).
3. WebOTP API: на Android Chrome и iOS Safari код подставляется автоматически из SMS.

### Админ

- Логин через модал на `/admin` (или `/admin/login`).
- JWT хранится в `localStorage` под ключом `trucare.admin.session`.
- `adminBeforeLoad` проверяет токен перед каждым админ-роутом.

---

## API клиент

Два режима работы (переключаются в `src/lib/api/index.ts`):

- **Mock** — данные из `src/lib/api/mock.ts` (разработка без бэкенда).
- **Real** — HTTP-клиент `src/lib/api/client.ts` (fetch + JWT + error handling).

Переключение также доступно через админ-панель: `/admin/settings`.

---

## Особенности реализации

### WebOTP

- `LoginDialog.tsx` и `verify-otp.tsx` вызывают `navigator.credentials.get()` внутри обработчика клика (user gesture).
- `OtpInput.tsx` имеет `autoComplete="one-time-code"` для iOS Safari.
- SMS-шаблон `otp_code` содержит `@{{domain}} #{{code}}` — последняя строка обязательна для WebOTP на Android Chrome.

### Календарь

- Двухнедельная сетка (`WeekGrid` + `DayCard`).
- Медицинский интерфейс: только "ימי טיפול" и "ימי הפסקה", без кнопок маркировки и пометок "утро/вечер".
- Демо-дневник (`/diary-demo`) работает без авторизации на моковых данных.

### Админ-панель

- `AdminLoginModal` — кастомный Dialog (Radix напрямую), без close button.
- `AdminSidebar` — навигация по всем админ-разделам.
- Все CRUD-операции логируют `created_by` / `updated_by`.

### Сброс цикла

- `ResetCycleModal` под календарем: старая `treatment_plan` удаляется, новая создаётся.
- История `notification_logs` и `reminder_logs` не затронута.

---

## Docker

```bash
docker compose up -d

# Frontend:  http://localhost:5173
# API:       http://localhost:8000
# phpMyAdmin: http://localhost:8080
```

---

## Деплой

Проект оптимизирован для деплоя на Vercel (TanStack Start).
См. конфигурацию в `vite.config.ts` и `package.json`.
