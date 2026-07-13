# TruCare PHP Backend — הנחיות מימוש

מסמך זה משלים את `README.md`, `openapi.yaml` ו-`schema.sql`. הוא מיועד למפתח PHP.

## דרישות (מותאם לשרת cPanel/CloudLinux)

**סביבה שנבדקה:**
- PHP **8.0** (התאימות הגבוהה ביותר שנתמכת בשרת)
- MariaDB **10.3.39** (תואם ל-MySQL 5.7/8.0 בפועל)
- Apache **2.4.58** דרך cPanel
- Linux x86_64, kernel 3.10 (CloudLinux/TuxCare)

**PHP extensions נדרשים** (כולם קיימים בברירת המחדל של cPanel PHP 8.0):
`pdo_mysql`, `openssl`, `mbstring`, `curl`, `json`, `hash`, `filter`.
`sodium` אופציונלי (משמש רק אם עוברים ל-libsodium במקום `openssl_encrypt`).

**כלים נוספים:**
- Composer (`composer.phar` מקומי מספיק, לא חייב התקנה גלובלית)
- HTTPS דרך AutoSSL של cPanel (TLS 1.2+)
- Cron של cPanel לניקוי טבלאות (`cPanel → Cron Jobs`)

**מגבלות PHP 8.0 (לא להשתמש):**
- אין `readonly` properties (8.1)
- אין enums (8.1) — להשתמש ב-class constants
- אין `never` return type (8.1)
- אין first-class callable syntax `foo(...)` (8.1)
- קיים ✅: constructor promotion, named args, `match`, `throw` כביטוי,
  `str_contains`/`str_starts_with`, `Stringable`, JIT.

**מגבלות MariaDB 10.3 (לא להשתמש):**
- אין functional/expression indexes (10.5+) — משתמשים ב-generated column
  PERSISTENT ואינדקס עליו (`sms_templates.key_unique` בסכימה).
- אין `JSON_TABLE` (10.6+). `JSON_EXTRACT` וסוגריים `->>` **כן** נתמכים.
- אין `SEQUENCE` ב-InnoDB (10.3 תומך רק על טבלאות SEQUENCE ייעודיות).
- ✅ נתמך: `DATETIME(3)`, `CHECK` constraints, `INVISIBLE` columns,
  window functions, CTEs (`WITH`), `utf8mb4_unicode_ci`.

## מבנה תיקיות מוצע

```
trucare-api/
├── public/
│   └── index.php              ← entry (front controller)
├── src/
│   ├── Bootstrap.php          ← DI, routing, middleware wiring
│   ├── Config.php             ← קריאת .env
│   ├── Db.php                 ← PDO singleton
│   ├── Http/
│   │   ├── Request.php
│   │   ├── Response.php
│   │   ├── Router.php
│   │   └── Middleware/
│   │       ├── Cors.php
│   │       ├── JsonBody.php
│   │       ├── BearerAuth.php
│   │       ├── AdminOnly.php
│   │       └── RateLimit.php
│   ├── Security/
│   │   ├── Jwt.php
│   │   ├── Pii.php            ← AES-256-GCM encrypt/decrypt
│   │   ├── Hash.php           ← sha256, hmac, argon2id
│   │   └── Ulid.php
│   ├── Sms/
│   │   └── Sms4Free.php       ← cURL client
│   ├── Repo/
│   │   ├── PatientRepo.php
│   │   ├── PlanRepo.php
│   │   ├── DoseRepo.php
│   │   ├── ConsentRepo.php
│   │   ├── OtpRepo.php
│   │   ├── SessionRepo.php
│   │   ├── AdminRepo.php
│   │   ├── SmsTemplateRepo.php
│   │   ├── NotificationRepo.php
│   │   ├── IncidentRepo.php
│   │   └── RateLimitRepo.php
│   └── Controllers/
│       ├── HealthController.php
│       ├── AuthController.php
│       ├── PatientController.php
│       ├── PlanController.php
│       ├── DoseController.php
│       └── AdminController.php
├── vendor/
├── .env.example
├── composer.json
└── README.md
```

Slim 4 מומלץ כ-router אם רוצים חסכון. Vanilla PDO + router מינימלי גם עובד.

## `.env` — כל המפתחות

```
# --- HTTP ---
APP_ENV=production
APP_URL=https://api.trucare.example.com
CORS_ALLOWED_ORIGINS=https://<project>.lovable.app,https://id-preview--<project>.lovable.app

# --- DB ---
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=trucare
DB_USER=trucare_app
DB_PASS=REPLACE_ME
DB_CHARSET=utf8mb4

# --- Crypto ---
JWT_SECRET=REPLACE_WITH_64_HEX_CHARS
PII_ENC_KEY=REPLACE_WITH_64_HEX_CHARS   # 32 bytes hex-encoded, AES-256-GCM key
HMAC_KEY=REPLACE_WITH_64_HEX_CHARS      # for consent signature_hmac

# --- Sessions ---
JWT_TTL_PATIENT=2592000                  # 30 days
JWT_TTL_ADMIN=28800                      # 8 hours

# --- sms4free ---
SMS4FREE_URL=https://api.sms4free.co.il/ApiSMS/SendSMS
SMS4FREE_KEY=REPLACE_ME
SMS4FREE_USER=REPLACE_ME
SMS4FREE_PASS=REPLACE_ME
SMS4FREE_SENDER=TruCare
```

לייצור מפתחות אקראיים:
```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

## Middleware — סדר טעינה

```
CORS → JsonBody → RateLimit → BearerAuth (אם דרוש) → AdminOnly (אם דרוש) → Controller
```

- **CORS**: קורא `CORS_ALLOWED_ORIGINS`, עונה 204 ל-OPTIONS.
- **JsonBody**: `json_decode` על גוף הבקשה, שגיאה → `VALIDATION_ERROR`.
- **RateLimit**: מבוסס `rate_limits` (sliding window). מפתח לפי route + subject.
- **BearerAuth**: מפצח JWT, בודק `sessions.token_hash`, טוען `subject`.
- **AdminOnly**: דורש `subject_type = 'admin'`.

## הצפנת PII (AES-256-GCM)

```php
final class Pii {
    public function __construct(private string $key) {} // 32 raw bytes

    public function encrypt(string $plain): string {
        $iv = random_bytes(12);
        $ct = openssl_encrypt($plain, 'aes-256-gcm', $this->key,
              OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        return $iv . $tag . $ct; // 12 + 16 + n bytes
    }

    public function decrypt(string $blob): string {
        $iv  = substr($blob, 0, 12);
        $tag = substr($blob, 12, 16);
        $ct  = substr($blob, 28);
        return openssl_decrypt($ct, 'aes-256-gcm', $this->key,
               OPENSSL_RAW_DATA, $iv, $tag) ?: throw new RuntimeException('pii_decrypt');
    }
}
```

לנרמל טלפון לפני hash (`preg_replace('/\D/', '', $phone)`).

## OTP — צד שרת

```php
// request
$phone     = normalize($input['recipient']);
$phoneHash = hash('sha256', $phone);
if ($rl->isOver("otp:$phoneHash", 3600, 3)) throw RateLimited();

$code       = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
$challengeId = bin2hex(random_bytes(16));
$otpRepo->insert([
  'id'         => $challengeId,
  'phone_hash' => $phoneHash,
  'code_hash'  => password_hash($code, PASSWORD_ARGON2ID),
  'expires_at' => (new DateTimeImmutable('+5 minutes'))->format('Y-m-d H:i:s.v'),
]);
$sms->send($phone, "קוד האימות שלך ל-TruCare: $code (בתוקף ל-5 דקות)");
return ['challengeId' => $challengeId, 'expiresAt' => ..., 'resendAvailableIn' => 60];

// verify
$ch = $otpRepo->find($input['challengeId']) ?? throw OtpInvalid();
if ($ch['consumed_at']) throw OtpConsumed();
if (new DateTimeImmutable() > new DateTimeImmutable($ch['expires_at'])) throw OtpExpired();
$otpRepo->incAttempts($ch['id']);
if ($ch['attempts'] + 1 > 5) { $otpRepo->delete($ch['id']); throw OtpInvalid(); }
if (!password_verify($input['code'], $ch['code_hash'])) throw OtpInvalid();
$otpRepo->markConsumed($ch['id']);
```

## sms4free — cURL client

```php
final class Sms4Free {
    public function __construct(private array $cfg) {}

    public function send(string $to, string $msg): array {
        $ch = curl_init($this->cfg['url']);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode([
                'key'       => $this->cfg['key'],
                'user'      => $this->cfg['user'],
                'pass'      => $this->cfg['pass'],
                'sender'    => $this->cfg['sender'],
                'recipient' => $to,
                'msg'       => $msg,
            ], JSON_UNESCAPED_UNICODE),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
        ]);
        $body = curl_exec($ch);
        $code = (int)trim((string)$body);
        curl_close($ch);
        return ['ok' => $code > 0, 'providerCode' => $code];
    }
}
```

תמיד לוג רק ל-`mask($to)` ול-`providerCode`. לעולם לא לרשום את גוף ההודעה עם הקוד ל-log.

## JWT (HS256)

השתמש ב-`firebase/php-jwt` (composer). Claims:
```json
{ "sub": "<subject_id>", "type": "patient|admin", "iat": 1720170000,
  "exp": 1722762000, "jti": "<random hex 16>" }
```

בכל login: הכנס ל-`sessions` עם `token_hash = hash('sha256', $jwt)`.
בכל בקשה מאומתת: אמת JWT + ודא שקיים ב-`sessions` ולא revoked.
ב-`POST /auth/logout`: `UPDATE sessions SET revoked_at=NOW(3) WHERE token_hash=?`.

## Rate limiting (sliding window)

```php
public function isOver(string $key, int $windowSec, int $max): bool {
    $cutoff = (new DateTimeImmutable("-{$windowSec} seconds"))->format('Y-m-d H:i:s.v');
    $this->pdo->prepare('DELETE FROM rate_limits WHERE bucket_key=? AND occurred_at<?')
              ->execute([$key, $cutoff]);
    $n = (int)$this->pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE bucket_key=?')
                        ->execute([$key])->fetchColumn();
    if ($n >= $max) return true;
    $this->pdo->prepare('INSERT INTO rate_limits (bucket_key, occurred_at) VALUES (?, NOW(3))')
              ->execute([$key]);
    return false;
}
```

## Cron ניקוי (cPanel)

ב-cPanel → **Cron Jobs**, להוסיף משימה כל 10 דקות. הנתיב לבינארי של PHP 8.0
בשרתי cPanel הוא בדרך כלל `/usr/local/bin/ea-php80`:

```
*/10 * * * *  /usr/local/bin/ea-php80 /home/<cpuser>/trucare-api/bin/cleanup.php
```

תוכן `cleanup.php` (מריץ את שלושת ה-DELETE דרך PDO):
```sql
DELETE FROM rate_limits    WHERE occurred_at < NOW() - INTERVAL 1 DAY;
DELETE FROM otp_challenges WHERE expires_at  < NOW() - INTERVAL 1 DAY;
DELETE FROM sessions       WHERE expires_at  < NOW() OR revoked_at IS NOT NULL;
```

**הערה לפריסה ב-cPanel:**
- שים את `public/` כ-Document Root (או צור `.htaccess` ב-`public_html`
  שמפנה הכל ל-`public/index.php`).
- אין להעלות את `.env`, `vendor/`, או `src/` אל תוך `public_html/`.
- הפעל את PHP 8.0 דרך **MultiPHP Manager** לדומיין של ה-API.
- ב-**PHP Selector** (CloudLinux) ודא שהרחבות `pdo_mysql`, `openssl`,
  `mbstring`, `curl` מסומנות.

## CORS מדויק

```php
$allowed = explode(',', $_ENV['CORS_ALLOWED_ORIGINS']);
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept, Accept-Language, X-Client');
    header('Access-Control-Max-Age: 86400');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
```

## Checklist לפני production

- [ ] TLS פעיל, HSTS מוגדר (`Strict-Transport-Security: max-age=31536000; includeSubDomains`)
- [ ] `JWT_SECRET`, `PII_ENC_KEY`, `HMAC_KEY` נוצרו אקראית ואינם ב-Git
- [ ] סיסמת admin ראשונית שונתה
- [ ] CORS מוגבל לדומיין ה-Lovable של הפרויקט
- [ ] Rate limits מופעלים על OTP + login
- [ ] Backup יומי של MySQL, encryption at rest ברמת האחסון
- [ ] Cron cleanup פעיל
- [ ] יומני שרת (nginx/apache) לא לוגים query strings עם טוקנים
- [ ] `display_errors = Off` ב-php.ini לייצור
