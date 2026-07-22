-- ============================================================================
-- TruCare — seed data
-- Run AFTER schema.sql.
-- Replace the admin email + password_hash before running in production.
-- ============================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Default admin (email: admin@trucare.local, password: ChangeMe!2026)
-- password_hash below is argon2id of "ChangeMe!2026" — REGENERATE for prod:
--   php -r "echo password_hash('YourPassword', PASSWORD_ARGON2ID);"
-- ---------------------------------------------------------------------------
INSERT INTO admin_users (id, email, password_hash, role, is_active, created_at)
VALUES (
  '01J8ADMINSEED0000000000001',
  'admin@trucare.local',
  '$argon2id$v=19$m=65536,t=4,p=1$c2VlZHNhbHRzZWVkc2FsdA$REPLACE_WITH_REAL_HASH',
  'admin',
  1,
  CURRENT_TIMESTAMP(3)
)
ON DUPLICATE KEY UPDATE email = email;

-- ---------------------------------------------------------------------------
-- Default SMS templates
-- Variables supported: {{firstName}}, {{code}}, {{time}}
-- ---------------------------------------------------------------------------
INSERT INTO sms_templates (id, key_name, name, body, enabled, updated_at) VALUES
  ('01J8TMPL0000000000000WELCM', 'welcome',
   'ברוכים הבאים',
   'שלום {{firstName}}, ברוך/ה הבא/ה ל-TruCare. נלווה אותך לאורך הטיפול.',
   1, CURRENT_TIMESTAMP(3)),

  ('01J8TMPL0000000000000MORN', 'morning_reminder',
   'תזכורת בוקר',
   'בוקר טוב {{firstName}}, זו תזכורת ליטול את מנת הבוקר בשעה {{time}}.',
   1, CURRENT_TIMESTAMP(3)),

  ('01J8TMPL0000000000000EVEN', 'evening_reminder',
   'תזכורת ערב',
   'ערב טוב {{firstName}}, נא ליטול את מנת הערב בשעה {{time}}.',
   1, CURRENT_TIMESTAMP(3)),

  ('01J8TMPL0000000000000MISS', 'missed_dose',
   'מנה שהוחמצה',
   '{{firstName}}, שמנו לב שטרם סימנת נטילת מנה היום. אנא עדכן/י ביומן.',
   1, CURRENT_TIMESTAMP(3)),

  ('01J8TMPL0000000000000STRT', 'start_treatment',
   'התחלת טיפול',
   'שלום {{firstName}}, זה היום שלך להתחיל את הטיפול בטרוקאפ. יש לפעול לפי הוראות הרופא המטפל והעלון לצרכן.',
   1, CURRENT_TIMESTAMP(3)),

  ('01J8TMPL0000000000000DAYOF', 'day_off',
   'יום הפסקה',
   'שלום {{firstName}}, היום יום הפסקה ואין ליטול את הטיפול. יש לפעול לפי הוראות הרופא.',
   1, CURRENT_TIMESTAMP(3)),

  ('01J8TMPL0000000000000OTPC', 'otp_code',
   'קוד אימות',
   'קוד האימות שלך ל-TruCare: {{code}}. הקוד תקף ל-5 דקות.',
   1, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  body = VALUES(body),
  enabled = VALUES(enabled),
  updated_at = CURRENT_TIMESTAMP(3);
