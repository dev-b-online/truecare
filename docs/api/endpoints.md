# TruCare — Endpoints Reference (עברית)

בסיס: `https://api.trucare.example.com/v1`
כל בקשה = JSON, כל תגובה = JSON. פורמט שגיאה אחיד ב-`README.md`.

## Public

### `GET /health`
בדיקת חיבור. אין auth.
```json
200 → { "ok": true, "version": "1.0.0", "time": "2026-07-05T10:00:00Z" }
```

---

## Auth

### `POST /auth/otp/request`
```json
Request:  { "channel": "sms", "recipient": "0501234567" }
200:      { "challengeId": "8f2a...c1", "expiresAt": "2026-07-05T10:05:00Z", "resendAvailableIn": 60 }
429:      { "error": { "code": "RATE_LIMITED", "message": "חרגת ממכסת בקשות" } }
```

### `POST /auth/otp/verify`
```json
Request:  { "challengeId": "8f2a...c1", "code": "482913" }
200:      { "sessionToken": "eyJhbGci...", "patientId": "01J8P..." }
400:      { "error": { "code": "OTP_INVALID", "message": "קוד שגוי", "details": { "attemptsLeft": 3 } } }
```

### `POST /auth/otp/resend`
```json
Request:  { "challengeId": "8f2a...c1", "recipient": "0501234567" }
200:      { "challengeId": "9c1b...d0", "expiresAt": "...", "resendAvailableIn": 60 }
```

### `POST /auth/admin/login`
```json
Request:  { "email": "admin@trucare.local", "password": "...", "totp": "123456" }
200:      { "sessionToken": "eyJ...", "adminId": "01J8A..." }
401:      { "error": { "code": "UNAUTHORIZED", "message": "פרטים שגויים" } }
```

### `POST /auth/logout`
`Authorization: Bearer <token>` — מסיים את ה-session הנוכחי.
```json
200: { "ok": true }
```

---

## Patients

### `POST /patients` — הרשמת מטופל (אחרי OTP-verify)
```json
Request:
{
  "challengeId": "8f2a...c1",
  "firstName": "יעל",
  "channel": "sms",
  "phone": "0501234567",
  "email": null,
  "startDate": "2026-07-05",
  "reminders": "on"
}
201:
{
  "patient": {
    "id": "01J8P...",
    "firstName": "יעל",
    "channel": "sms",
    "phoneMasked": "050****567",
    "startDate": "2026-07-05",
    "reminders": "on",
    "language": "he",
    "createdAt": "2026-07-05T10:07:00Z"
  },
  "sessionToken": "eyJ..."
}
409: { "error": { "code": "CONFLICT", "message": "מטופל עם מספר זה כבר רשום" } }
```

### `GET /patients/me`
`Authorization: Bearer <patient-token>`
```json
200: { "patient": { ...כמו למעלה... } }
```

### `POST /patients/me/consent`
```json
Request:
{
  "termsVersion": "2026-01",
  "privacyPolicyVersion": "2026-01",
  "disclaimerVersion": "2026-01",
  "marketingOptIn": false
}
201:
{
  "consent": {
    "id": "01J8C...",
    "patientId": "01J8P...",
    "termsVersion": "2026-01",
    "privacyPolicyVersion": "2026-01",
    "disclaimerVersion": "2026-01",
    "marketingOptIn": false,
    "acceptedAt": "2026-07-05T10:08:00Z",
    "signatureHmac": "hmac_..."
  }
}
```

---

## Treatment plan & doses

### `GET /plans/mine`
```json
200:
{
  "plan": {
    "id": "01J8PL...",
    "patientId": "01J8P...",
    "startDate": "2026-07-05",
    "cycleLengthDays": 7,
    "treatmentDays": 4,
    "breakDays": 3,
    "createdAt": "2026-07-05T10:07:01Z"
  }
}
```

### `GET /plans/{planId}/doses?from=YYYY-MM-DD&to=YYYY-MM-DD`
```json
200:
{
  "doses": [
    {
      "id": "01J8D...",
      "planId": "01J8PL...",
      "date": "2026-07-05",
      "slot": "morning",
      "status": "planned",
      "scheduledFor": "2026-07-05T07:00:00Z",
      "takenAt": null,
      "notes": null
    }
  ]
}
```

### `PATCH /doses/{id}`
```json
Request: { "status": "taken", "notes": "לפני ארוחת בוקר" }
200:
{
  "dose": {
    "id": "01J8D...",
    "planId": "01J8PL...",
    "date": "2026-07-05",
    "slot": "morning",
    "status": "taken",
    "scheduledFor": "2026-07-05T07:00:00Z",
    "takenAt": "2026-07-05T07:15:22Z",
    "notes": "לפני ארוחת בוקר"
  }
}
```

---

## Admin

### `GET /admin/stats`
```json
200:
{
  "patientsTotal": 128,
  "activePlans": 118,
  "dosesTaken": 940,
  "dosesMissed": 42,
  "adherenceRate": 0.957,
  "smsSent": 1024,
  "smsFailed": 6
}
```

### `GET /admin/notifications?limit=50&cursor=...`
```json
200:
{
  "items": [
    {
      "id": "01J8N...",
      "channel": "sms",
      "recipientMasked": "050****321",
      "template": "morning_reminder",
      "status": "sent",
      "providerCode": 1,
      "error": null,
      "createdAt": "2026-07-04T09:00:00Z"
    }
  ],
  "nextCursor": null
}
```

### `GET /admin/incidents?limit=50&cursor=...`
```json
200:
{
  "items": [
    {
      "id": "01J8I...",
      "severity": "warning",
      "code": "SMS_RATE_LIMIT",
      "message": "חריגה זמנית בקצב שליחת SMS",
      "createdAt": "2026-07-02T12:00:00Z",
      "resolvedAt": "2026-07-02T12:15:00Z"
    }
  ],
  "nextCursor": null
}
```

### `GET /admin/sms/templates`
```json
200:
{
  "items": [
    {
      "id": "01J8T...",
      "key": "morning_reminder",
      "name": "תזכורת בוקר",
      "body": "בוקר טוב {{firstName}}...",
      "enabled": true,
      "updatedAt": "2026-07-01T00:00:00Z"
    }
  ]
}
```

### `POST /admin/sms/templates`
```json
Request:
{ "key": "custom", "name": "מבצע קיץ", "body": "שלום {{firstName}}...", "enabled": true }
201: { "template": { ...כמו למעלה... } }
```

### `PATCH /admin/sms/templates/{id}`
```json
Request: { "name": "...", "body": "...", "enabled": false }
200:     { "template": { ... } }
```

### `DELETE /admin/sms/templates/{id}`
```json
200: { "ok": true }
```

### `GET /admin/sms/health`
```json
200:
{
  "sender": "TruCare",
  "providerConfigured": true,
  "keyMasked": "abc***xyz",
  "userMasked": "u12***78",
  "passMasked": "••••••••",
  "source": "env"
}
```

### `POST /admin/sms/test`
```json
Request: { "recipient": "0501234567", "templateKey": "morning_reminder" }
200:     { "ok": true, "providerCode": 1 }
502:     { "error": { "code": "SMS_PROVIDER_ERROR", "message": "provider error -3" } }
```
