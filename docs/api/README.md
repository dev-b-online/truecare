# TruCare Backend — חבילת מסירה למפתח PHP + MySQL

מסמך זה הוא נקודת הכניסה למפתח שבונה את השרת. כל הקבצים בתיקייה מתארים את החוזה בין אפליקציית ה-Lovable (React) לבין ה-API שירוץ ב-PHP מול MySQL.

## מה יש בתיקייה

| קובץ | תיאור |
|---|---|
| `README.md` | המסמך הזה — סקירה, ארכיטקטורה, אימות, שגיאות, CORS, PII |
| `openapi.yaml` | חוזה API מלא בפורמט OpenAPI 3.1 — כל endpoint, סכימה, וקוד שגיאה |
| `endpoints.md` | טבלת endpoints בעברית עם דוגמאות request/response מלאות |
| `schema.sql` | סקריפט MariaDB 10.3 שיוצר את כל הטבלאות, האינדקסים וה-FKs |
| `seed.sql` | נתוני התחלה: תבניות SMS ברירת מחדל + משתמש אדמין ראשוני |
| `php-notes.md` | הנחיות מימוש PHP: מבנה תיקיות, `.env`, JWT, OTP, sms4free, rate-limit |
| `postman.json` | Postman Collection לבדיקה של כל ה-endpoints |

## ארכיטקטורה כללית

```
┌────────────────────────┐          HTTPS + JSON          ┌────────────────────────┐
│  Lovable React SPA     │  ────────────────────────────▶ │  PHP 8.0 REST API      │
│  (mobile-first, RTL)   │  Authorization: Bearer <token> │  Slim / Lumen / vanilla│
│                        │  ◀──────────────────────────── │                        │
└────────────────────────┘          JSON responses         └───────────┬────────────┘
                                                                       │
                                                          ┌────────────┴───────────┐
                                                          │   MariaDB 10.3          │
                                                          │  utf8mb4, InnoDB        │
                                                          │  PII מוצפן AES-256-GCM  │
                                                          └────────────┬───────────┘
                                                                       │
                                                          ┌────────────┴───────────┐
                                                          │   sms4free (SMS)        │
                                                          │  cURL בלבד מה-PHP       │
                                                          └────────────────────────┘
```

**עקרונות:**
- הפרונט לא מכיר סודות כלשהם. כל סוד (DB, JWT, sms4free) חי רק ב-`.env` של ה-PHP.
- הפרונט שומר Bearer token אחד ב-`localStorage` (מפתח `trucare.session`).
- כל ה-PII (טלפון, אימייל) מוצפן במנוחה. יומנים שומרים רק ערכים ממוסכים (`050****321`).
- אין edge functions, אין WebSockets. REST בלבד.

## Base URL

```
Production:  https://api.trucare.example.com/v1
Staging:     https://staging-api.trucare.example.com/v1
```

הפרונט מגדיר את ה-Base URL דרך `/admin/settings` — ניתן להחליף בין mock ל-real בלי שינוי קוד.

## אימות (Authentication)

שני סוגי משתמשים, אותו מנגנון: Bearer token.

### מטופל
1. `POST /auth/otp/request` עם טלפון → ה-PHP מייצר קוד 6 ספרות, שולח ב-SMS, מחזיר `challengeId`.
2. `POST /auth/otp/verify` עם `challengeId` + `code` → מחזיר `sessionToken` (JWT).
3. הפרונט שולח `Authorization: Bearer <sessionToken>` בכל בקשה.

### אדמין
1. `POST /auth/admin/login` עם אימייל + סיסמה (+TOTP אופציונלי) → מחזיר `sessionToken`.
2. הפרונט שומר בנפרד מטוקן המטופל (מפתח `trucare.admin.session`).

**JWT:**
- אלגוריתם: `HS256`, secret ב-`JWT_SECRET`.
- TTL מטופל: 30 יום. TTL אדמין: 8 שעות.
- claims: `sub`, `type` (`patient`|`admin`), `iat`, `exp`, `jti`.
- כל טוקן פעיל נשמר גם ב-`sessions` כ-`SHA-256(token)` כדי לאפשר revoke ב-`POST /auth/logout`.

## Headers חובה

```
Authorization: Bearer <token>       // בכל endpoint שאינו public
Content-Type:  application/json; charset=utf-8
Accept:        application/json
Accept-Language: he
X-Client:      TruCare-Web
```

## פורמט שגיאות אחיד

כל שגיאה חוזרת עם קוד HTTP מתאים וגוף JSON עקבי:

```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "קוד שגוי או פג תוקף",
    "details": { "attemptsLeft": 2 }
  }
}
```

### קודי שגיאה קנוניים

| code | HTTP | מתי |
|---|---|---|
| `VALIDATION_ERROR` | 400 | קלט לא תקין (Zod-like) |
| `UNAUTHORIZED` | 401 | Bearer חסר/פג תוקף |
| `FORBIDDEN` | 403 | אין הרשאה (אדמין/מטופל) |
| `NOT_FOUND` | 404 | משאב לא קיים |
| `CONFLICT` | 409 | כפילות (טלפון כבר רשום) |
| `RATE_LIMITED` | 429 | חריגה ממכסה |
| `OTP_INVALID` | 400 | קוד OTP שגוי |
| `OTP_EXPIRED` | 400 | קוד OTP פג תוקף |
| `OTP_CONSUMED` | 400 | קוד כבר נוצל |
| `SMS_PROVIDER_ERROR` | 502 | sms4free החזיר שגיאה |
| `INTERNAL_ERROR` | 500 | כשל לא צפוי |

**חשוב:** לעולם לא לחשוף פרטים פנימיים (stack trace, שם עמודה, path לקובץ) בגוף השגיאה.

## CORS

הרשה רק את דומייני ה-Lovable של הפרויקט:

```
Access-Control-Allow-Origin: https://<project>.lovable.app
Access-Control-Allow-Origin: https://id-preview--<project>.lovable.app
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept, Accept-Language, X-Client
Access-Control-Max-Age: 86400
```

יש לענות `204 No Content` לבקשות `OPTIONS` (preflight).

## Rate Limiting

מיושם ב-PHP באמצעות טבלת `rate_limits` (sliding window). מכסות ברירת מחדל:

| bucket | חלון | מקסימום |
|---|---|---|
| `otp:request:<phone_hash>` | שעה | 3 |
| `otp:verify:<challengeId>` | 15 דק' | 5 נסיונות |
| `admin:login:<ip_hash>` | 15 דק' | 10 |
| `sms:test:<admin_id>` | דקה | 5 |
| ברירת מחדל לכל endpoint | דקה | 60 |

חריגה → `429 RATE_LIMITED` עם header `Retry-After: <seconds>`.

## PII ומיסוך

- **טלפון ואימייל** נשמרים מוצפנים (`AES-256-GCM` עם מפתח `PII_ENC_KEY` של 32 בייט). מקבילית נשמר `SHA-256` לחיפוש/rate-limit.
- **יומנים** (`notification_logs`, `incidents`) שומרים רק גרסה ממוסכת: `050****321`.
- **OTP** נשמר כ-`argon2id(code)` בלבד. הקוד עצמו לא נשמר.
- **הסכמות** נחתמות ב-HMAC-SHA256 על snapshot של הגרסאות + timestamp.
- **טוקנים** נשמרים כ-`SHA-256(token)`. הטוקן עצמו קיים רק בזיכרון הלקוח.

## Endpoints — סקירה מהירה

ראה `endpoints.md` לפירוט מלא ו-`openapi.yaml` לחוזה מכונה.

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | none |
| POST | `/auth/otp/request` | none |
| POST | `/auth/otp/verify` | none |
| POST | `/auth/otp/resend` | none |
| POST | `/auth/admin/login` | none |
| POST | `/auth/logout` | any |
| POST | `/patients` | otp-challenge |
| GET | `/patients/me` | patient |
| POST | `/patients/me/consent` | patient |
| GET | `/plans/mine` | patient |
| GET | `/plans/{id}/doses` | patient |
| PATCH | `/doses/{id}` | patient |
| GET | `/admin/stats` | admin |
| GET | `/admin/notifications` | admin |
| GET | `/admin/incidents` | admin |
| GET | `/admin/sms/templates` | admin |
| POST | `/admin/sms/templates` | admin |
| PATCH | `/admin/sms/templates/{id}` | admin |
| DELETE | `/admin/sms/templates/{id}` | admin |
| GET | `/admin/sms/health` | admin |
| POST | `/admin/sms/test` | admin |

## סדר עבודה מומלץ למפתח ה-PHP

1. צור בסיס נתונים ב-cPanel (MariaDB 10.3), הרץ `schema.sql` ואז `seed.sql`.
2. הרם שלד PHP (Slim מומלץ, או vanilla PDO). קרא `php-notes.md`.
3. מלא את `.env` (רשימת המפתחות ב-`php-notes.md`).
4. מימוש לפי סדר: `/health` → auth (OTP + admin) → `/patients` + `/plans` + `/doses` → אדמין (`/admin/*`).
5. בדוק כל endpoint עם `postman.json`.
6. הפעל את ה-CORS מול דומיין ה-Lovable של הפרויקט.
7. מסור URL + טוקן בדיקה — הפרונט יגדיר אותם ב-`/admin/settings` ויכבה את ה-Mock.
