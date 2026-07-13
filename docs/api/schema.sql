-- ============================================================================
-- TruCare — MariaDB 10.3 schema (also compatible with MySQL 5.7+/8.0)
-- Server target: MariaDB 10.3.39 on cPanel / shared hosting
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- Engine: InnoDB
-- All PII columns are stored encrypted (AES-256-GCM) via the application layer.
--
-- Notes for MariaDB 10.3:
--   * Functional / expression indexes are NOT supported (added in 10.5+).
--     The uniqueness of non-`custom` template keys is enforced via a
--     PERSISTENT generated column (see section 8 below).
--   * DATETIME(3) fractional seconds ARE supported.
--   * `CHECK` constraints are enforced starting 10.2.1 — safe to use.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION';

-- ---------------------------------------------------------------------------
-- 1) patients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id                CHAR(26)         NOT NULL,                     -- ULID
  first_name        VARCHAR(80)      NOT NULL,
  channel           ENUM('sms','email') NOT NULL,
  phone_enc         VARBINARY(512)   NULL,                         -- AES-256-GCM ciphertext
  phone_hash        CHAR(64)         NULL,                         -- SHA-256(normalized phone)
  email_enc         VARBINARY(512)   NULL,
  email_hash        CHAR(64)         NULL,
  start_date        DATE             NOT NULL,
  reminders         ENUM('on','off') NOT NULL DEFAULT 'on',
  language          CHAR(2)          NOT NULL DEFAULT 'he',
  created_at        DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_patients_phone_hash (phone_hash),
  UNIQUE KEY uk_patients_email_hash (email_hash),
  KEY idx_patients_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2) treatment_plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_plans (
  id                  CHAR(26)     NOT NULL,
  patient_id          CHAR(26)     NOT NULL,
  start_date          DATE         NOT NULL,
  cycle_length_days   TINYINT UNSIGNED NOT NULL DEFAULT 7,
  treatment_days      TINYINT UNSIGNED NOT NULL DEFAULT 4,
  break_days          TINYINT UNSIGNED NOT NULL DEFAULT 3,
  created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_plans_patient (patient_id),
  CONSTRAINT fk_plans_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3) dose_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dose_events (
  id             CHAR(26)     NOT NULL,
  plan_id        CHAR(26)     NOT NULL,
  `date`         DATE         NOT NULL,
  slot           ENUM('morning','evening') NOT NULL,
  status         ENUM('taken','planned','missed','not_required') NOT NULL DEFAULT 'planned',
  scheduled_for  DATETIME(3)  NOT NULL,
  taken_at       DATETIME(3)  NULL,
  notes          VARCHAR(500) NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_dose_plan_date_slot (plan_id, `date`, slot),
  KEY idx_dose_status (status),
  KEY idx_dose_date (`date`),
  CONSTRAINT fk_dose_plan
    FOREIGN KEY (plan_id) REFERENCES treatment_plans(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4) consents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
  id                        CHAR(26)     NOT NULL,
  patient_id                CHAR(26)     NOT NULL,
  terms_version             VARCHAR(20)  NOT NULL,
  privacy_policy_version    VARCHAR(20)  NOT NULL,
  disclaimer_version        VARCHAR(20)  NOT NULL,
  marketing_opt_in          TINYINT(1)   NOT NULL DEFAULT 0,
  accepted_at               DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  signature_hmac            CHAR(64)     NOT NULL,   -- HMAC-SHA256(snapshot, HMAC_KEY)
  ip_hash                   CHAR(64)     NULL,       -- SHA-256(client ip)
  user_agent_hash           CHAR(64)     NULL,
  PRIMARY KEY (id),
  KEY idx_consents_patient (patient_id),
  CONSTRAINT fk_consents_patient
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5) otp_challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_challenges (
  id             CHAR(32)     NOT NULL,           -- hex(random_bytes(16))
  phone_hash     CHAR(64)     NOT NULL,
  code_hash      VARCHAR(255) NOT NULL,           -- argon2id
  attempts       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at     DATETIME(3)  NOT NULL,
  consumed_at    DATETIME(3)  NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_otp_phone_created (phone_hash, created_at),
  KEY idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6) admin_users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id                 CHAR(26)     NOT NULL,
  email              VARCHAR(190) NOT NULL,
  password_hash      VARCHAR(255) NOT NULL,       -- argon2id
  totp_secret_enc    VARBINARY(255) NULL,         -- AES-256-GCM
  role               ENUM('admin','viewer') NOT NULL DEFAULT 'admin',
  is_active          TINYINT(1)   NOT NULL DEFAULT 1,
  last_login_at      DATETIME(3)  NULL,
  created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7) sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token_hash        CHAR(64)     NOT NULL,        -- SHA-256(bearer token)
  subject_type      ENUM('patient','admin') NOT NULL,
  subject_id        CHAR(26)     NOT NULL,
  expires_at        DATETIME(3)  NOT NULL,
  last_used_at      DATETIME(3)  NULL,
  user_agent_hash   CHAR(64)     NULL,
  ip_hash           CHAR(64)     NULL,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  revoked_at        DATETIME(3)  NULL,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_subject (subject_type, subject_id),
  KEY idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8) sms_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_templates (
  id             CHAR(26)     NOT NULL,
  key_name       ENUM('welcome','morning_reminder','evening_reminder',
                      'missed_dose','otp_code','custom') NOT NULL,
  -- Persistent generated column: NULL for 'custom' rows (allows many),
  -- equal to key_name otherwise (enforces uniqueness via the index below).
  -- MariaDB 10.3 supports PERSISTENT generated columns; MySQL 8 users can
  -- replace PERSISTENT with STORED.
  key_unique     VARCHAR(32)  AS (IF(key_name = 'custom', NULL, key_name)) PERSISTENT,
  name           VARCHAR(120) NOT NULL,
  body           VARCHAR(480) NOT NULL,
  enabled        TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  updated_by     CHAR(26)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_templates_unique_key (key_unique),
  KEY idx_templates_key (key_name),
  CONSTRAINT fk_templates_admin
    FOREIGN KEY (updated_by) REFERENCES admin_users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9) notification_logs — masked-only, safe to expose in admin UI
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
  id                 CHAR(26)     NOT NULL,
  channel            ENUM('sms','email') NOT NULL,
  recipient_masked   VARCHAR(32)  NOT NULL,       -- e.g. 050****321
  template           VARCHAR(60)  NOT NULL,
  status             ENUM('sent','failed') NOT NULL,
  provider_code      SMALLINT     NULL,
  error              VARCHAR(255) NULL,
  created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notif_created (created_at),
  KEY idx_notif_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10) incidents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
  id            CHAR(26)     NOT NULL,
  severity      ENUM('info','warning','error') NOT NULL,
  code          VARCHAR(60)  NOT NULL,
  message       VARCHAR(500) NOT NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at   DATETIME(3)  NULL,
  PRIMARY KEY (id),
  KEY idx_incidents_created (created_at),
  KEY idx_incidents_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11) rate_limits — sliding window counter
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key    VARCHAR(160) NOT NULL,
  occurred_at   DATETIME(3)  NOT NULL,
  PRIMARY KEY (bucket_key, occurred_at),
  KEY idx_rl_occurred (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ---------------------------------------------------------------------------
-- 12) app_settings — runtime configuration (DB overrides .env values)
-- ---------------------------------------------------------------------------
-- Keys used by the application:
--   sms4free.key     — sms4free API key
--   sms4free.user    — sms4free username
--   sms4free.pass    — sms4free password
--   sms4free.sender  — SMS sender name (e.g. TruCare)
--   sms4free.url     — API endpoint URL (optional override)
--
-- Priority: DB value → ENV variable → hardcoded default
-- Admin UI at /admin/sms-settings saves credentials here via PUT /admin/sms/config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  `key`        VARCHAR(80)   NOT NULL,
  `value`      TEXT          NOT NULL,
  updated_at   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
               ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Maintenance suggestions (run as cron):
--   DELETE FROM rate_limits    WHERE occurred_at < NOW() - INTERVAL 1 DAY;
--   DELETE FROM otp_challenges WHERE expires_at  < NOW() - INTERVAL 1 DAY;
--   DELETE FROM sessions       WHERE expires_at  < NOW() OR revoked_at IS NOT NULL;
-- ---------------------------------------------------------------------------

