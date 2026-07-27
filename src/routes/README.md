# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                     |
| ------------------------ | ------------------------------------------------------- |
| `index.tsx`              | `/`                                                     |
| `about.tsx`              | `/about`                                                |
| `users/index.tsx`        | `/users`                                                |
| `users/$id.tsx`          | `/users/:id` (dynamic — bare `$`, no curly braces)      |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                  |
| `files/$.tsx`            | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)        |
| `__root.tsx`             | app shell — wraps every page; preserve `<Outlet />`     |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Admin routes

| File                          | URL                                    |
| ----------------------------- | -------------------------------------- |
| `admin.tsx`                   | `/admin` (dashboard + layout)          |
| `admin.patients.tsx`          | `/admin/patients` (список пациентов)   |
| `admin.notifications.tsx`     | `/admin/notifications` (лог уведомлений) |
| `admin.incidents.tsx`         | `/admin/incidents` (лог инцидентов)    |
| `admin.sms-templates.tsx`     | `/admin/sms-templates` (SMS шаблоны)   |
| `admin.email-templates.tsx`   | `/admin/email-templates` (Email шаблоны) |
| `admin.sms-settings.tsx`      | `/admin/sms-settings` (настройки SMS)  |
| `admin.smtp-settings.tsx`     | `/admin/smtp-settings` (настройки SMTP) |
| `admin.settings.tsx`          | `/admin/settings` (API настройки)      |

## Patient routes

| File                          | URL                                    |
| ----------------------------- | -------------------------------------- |
| `index.tsx`                  | `/` (главная с кнопкой логина)         |
| `register.tsx`               | `/register` (регистрация)              |
| `verify-otp.tsx`             | `/verify-otp` (верификация OTP)        |
| `onboarding.tsx`             | `/onboarding` (онбординг)               |
| `instructions.tsx`           | `/instructions` (инструкции)            |
| `diary.tsx`                  | `/diary` (дневник пациента)            |
| `diary-demo.tsx`             | `/diary-demo` (демо-дневник)           |
