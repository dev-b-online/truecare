## איפה יהיה כל הפירוט למפתח ה-PHP

כל התיעוד יישמר בתיקיית `docs/api/` בפרויקט, וניתן להורדה גם כקבצים מוכנים מ-`/mnt/documents/trucare-backend/` כדי להעביר למפתח בקלות.

```
docs/api/
├── README.md              ← מסמך על ראשי בעברית: ארכיטקטורה, אימות, שגיאות, CORS, PII
├── openapi.yaml           ← חוזה API מלא (OpenAPI 3.1) — כל endpoint, סכימה, קוד שגיאה
├── endpoints.md           ← טבלת endpoints בעברית עם דוגמאות request/response
├── php-notes.md           ← הנחיות מימוש PHP: מבנה תיקיות, .env, JWT, sms4free, rate limit
├── schema.sql             ← סקריפט MySQL מלא (CREATE TABLE + אינדקסים + FKs)
├── seed.sql               ← נתוני דמו (תבניות SMS ברירת מחדל, admin ראשון)
└── postman.json           ← קולקציית Postman לבדיקה
```

## מבנה בסיס הנתונים (MySQL 8, utf8mb4, InnoDB)

11 טבלאות שמכסות את כל הפונקציונליות של הפרונט.

### 1. `patients` — מטופלים

```
id CHAR(26) PK              -- ULID
first_name VARCHAR(80)
channel ENUM('sms','email')
phone_enc VARBINARY(255)    -- AES-256-GCM
phone_hash CHAR(64)         -- SHA-256 לחיפוש/rate limit
email_enc VARBINARY(255) NULL
email_hash CHAR(64) NULL
start_date DATE
reminders ENUM('on','off')
language CHAR(2) DEFAULT 'he'
created_at DATETIME(3)
UNIQUE(phone_hash), UNIQUE(email_hash)
```

### 2. `treatment_plans` — תוכניות טיפול

```
id CHAR(26) PK
patient_id CHAR(26) FK → patients(id) ON DELETE CASCADE
start_date DATE
cycle_length_days TINYINT DEFAULT 7
treatment_days TINYINT DEFAULT 4
break_days TINYINT DEFAULT 3
created_at DATETIME(3)
INDEX(patient_id)
```

### 3. `dose_events` — אירועי נטילה

```
id CHAR(26) PK
plan_id CHAR(26) FK → treatment_plans(id) ON DELETE CASCADE
date DATE
slot ENUM('morning','evening')
status ENUM('taken','planned','missed','not_required')
scheduled_for DATETIME(3)
taken_at DATETIME(3) NULL
notes VARCHAR(500) NULL
UNIQUE(plan_id, date, slot), INDEX(status)
```

### 4. `consents` — הסכמות

```
id CHAR(26) PK
patient_id CHAR(26) FK → patients(id) ON DELETE CASCADE
terms_version VARCHAR(20)
privacy_policy_version VARCHAR(20)
disclaimer_version VARCHAR(20)
marketing_opt_in BOOL
accepted_at DATETIME(3)
signature_hmac CHAR(64)     -- HMAC-SHA256 על snapshot של המסמכים
ip_hash CHAR(64)
INDEX(patient_id)
```

### 5. `otp_challenges` — צ'לנג'י OTP

```
id CHAR(32) PK
phone_hash CHAR(64)
code_hash CHAR(64)          -- argon2id של הקוד
attempts TINYINT DEFAULT 0
expires_at DATETIME(3)
consumed_at DATETIME(3) NULL
created_at DATETIME(3)
INDEX(phone_hash, created_at)
```

### 6. `sessions` — סשנים

```
token_hash CHAR(64) PK      -- SHA-256 של ה-Bearer
subject_type ENUM('patient','admin')
subject_id CHAR(26)
expires_at DATETIME(3)
last_used_at DATETIME(3)
user_agent_hash CHAR(64)
created_at DATETIME(3)
INDEX(subject_type, subject_id)
```

### 7. `admin_users` — משתמשי אדמין

```
id CHAR(26) PK
email VARCHAR(190) UNIQUE
password_hash VARCHAR(255)  -- argon2id
totp_secret_enc VARBINARY(255) NULL
role ENUM('admin','viewer') DEFAULT 'admin'
last_login_at DATETIME(3) NULL
created_at DATETIME(3)
```

### 8. `sms_templates` — תבניות SMS

```
id CHAR(26) PK
key_name ENUM('welcome','morning_reminder','evening_reminder','missed_dose','otp_code','custom')
name VARCHAR(120)
body VARCHAR(480)
enabled BOOL DEFAULT 1
updated_at DATETIME(3)
updated_by CHAR(26) NULL FK → admin_users(id)
UNIQUE(key_name) WHERE key_name <> 'custom'
```

### 9. `notification_logs` — יומן SMS (ממוסך בלבד)

```
id CHAR(26) PK
channel ENUM('sms','email')
recipient_masked VARCHAR(20)   -- 050****321
template VARCHAR(60)
status ENUM('sent','failed')
provider_code SMALLINT NULL
error VARCHAR(255) NULL
created_at DATETIME(3)
INDEX(created_at DESC), INDEX(status)
```

### 10. `incidents` — יומן אירועים

```
id CHAR(26) PK
severity ENUM('info','warning','error')
code VARCHAR(60)
message VARCHAR(500)
created_at DATETIME(3)
resolved_at DATETIME(3) NULL
INDEX(created_at DESC), INDEX(severity)
```

### 11. `rate_limits` — Sliding window

```
bucket_key VARCHAR(120)
occurred_at DATETIME(3)
PRIMARY KEY(bucket_key, occurred_at)
```

## endpoints שיסופקו ב-OpenAPI

| Method                | Path                         | תיאור                      | Auth          |
| --------------------- | ---------------------------- | -------------------------- | ------------- |
| GET                   | `/health`                    | ping                       | none          |
| POST                  | `/auth/otp/request`          | בקשת OTP                   | none          |
| POST                  | `/auth/otp/verify`           | אימות → session            | none          |
| POST                  | `/auth/otp/resend`           | שליחה חוזרת                | none          |
| POST                  | `/auth/admin/login`          | אימות אדמין                | none          |
| POST                  | `/auth/logout`               | סיום session               | any           |
| POST                  | `/patients`                  | הרשמה                      | otp-challenge |
| GET                   | `/patients/me`               | פרטי מטופל                 | patient       |
| POST                  | `/patients/me/consent`       | שמירת הסכמות               | patient       |
| GET                   | `/plans/mine`                | תוכנית טיפול               | patient       |
| GET                   | `/plans/{id}/doses`          | אירועי נטילה               | patient       |
| PATCH                 | `/doses/{id}`                | סימון taken/missed + notes | patient       |
| GET                   | `/admin/stats`               | KPIs                       | admin         |
| GET                   | `/admin/notifications`       | יומן SMS ממוסך             | admin         |
| GET                   | `/admin/incidents`           | יומן אירועים               | admin         |
| GET/POST/PATCH/DELETE | `/admin/sms/templates[/:id]` | CRUD תבניות                | admin         |
| GET                   | `/admin/sms/health`          | סטטוס ספק + sender         | admin         |
| POST                  | `/admin/sms/test`            | שליחת בדיקה                | admin         |

כל endpoint יכלול ב-OpenAPI: request schema, response schema, קודי שגיאה (`OTP_INVALID`, `RATE_LIMITED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `SMS_PROVIDER_ERROR`), ודוגמאות.

## תוכן `php-notes.md`

- מבנה תיקיות מוצע (Slim/Lumen/vanilla PDO) + entry `public/index.php`
- טעינת `.env`: `DB_*`, `JWT_SECRET`, `PII_ENC_KEY` (32 בייט), `SMS4FREE_KEY/USER/PASS/SENDER`, `CORS_ALLOWED_ORIGINS`
- middleware: CORS, JSON body, Bearer auth, admin-role guard, rate limit
- הצפנת PII: `openssl_encrypt` AES-256-GCM עם ה-`PII_ENC_KEY`
- OTP: argon2id על הקוד, מחיקה אחרי consume, 5 נסיונות מקסימום, 5 דק' תוקף, 3 בקשות לשעה לכל `phone_hash`
- JWT: HS256, TTL 30 יום למטופל, 8 שעות לאדמין; שמירת `token_hash` ב-`sessions`
- SMS: cURL ל-`https://api.sms4free.co.il/ApiSMS/SendSMS`, לוג רק ל-`recipient_masked` ו-`provider_code`
- CORS מתיר רק את דומייני ה-Lovable של הפרויקט
- דוגמת קוד PHP (25-30 שורות) לכל אחד מ: בדיקת Bearer, שליחת SMS, יצירת OTP, אימות OTP

## עדכונים בפרונט (מקבילים לתיעוד)

- מחיקה: `src/lib/sms/sms4free.functions.ts`, `src/lib/otp/otp.functions.ts`
- יצירה: `src/lib/api/http.ts` (fetch client), `src/lib/api/httpApi.ts` (מימוש `httpApi` תואם ל-`mockApi`)
- עדכון: `src/lib/api/index.ts` בוחר לפי `apiSettings.useMock`
- עדכון: `/admin/settings` — הוספת שדה API Token (מוסתר) וכפתור "בדוק חיבור" (`GET /health`)
- עדכון: `/admin/sms-settings` — הסרת key/user/pass, השארת sender + סטטוס + כפתור בדיקה
- עדכון: `/verify-otp`, `/register`, `/admin/sms-templates` — קריאה ל-`api.*` במקום `useServerFn`

## Out of scope

- אין כתיבת קוד PHP בפועל — רק חוזה + סקריפט SQL + הנחיות מימוש.
- אין שינוי ויזואלי במסכים.
- אין ניהול סודות SMS/DB בצד Lovable.

מוכן להתחיל? אאשר ואקפוץ מיד לביצוע — כולל יצירת קבצי `docs/api/` והעתקתם ל-`/mnt/documents/` להורדה נוחה.
