-- =====================================================
-- CSAP — csap_schema.sql
-- MariaDB / MySQL schema for Hostinger deployment
-- Run this in phpMyAdmin or via CLI before deploying.
-- =====================================================

-- ── 1. Users table ───────────────────────────────────
-- Roles:
--   admin     : full platform control, can promote/demote any role
--   superuser : can manage users (add/edit/delete) but cannot change roles
--   user      : read-only access (list members only)

CREATE TABLE IF NOT EXISTS `csap_users` (
    `id`            INT            NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(120)   NOT NULL,
    `email`         VARCHAR(180)   NOT NULL,
    `password_hash` VARCHAR(255)   NOT NULL,          -- bcrypt via PHP password_hash()
    `role`          ENUM('admin','superuser','user')
                                   NOT NULL DEFAULT 'user',
    `status`        ENUM('active','pending','suspended')
                                   NOT NULL DEFAULT 'pending',
    `created_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                             ON UPDATE CURRENT_TIMESTAMP,
    `last_login`    DATETIME                DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_email` (`email`),
    INDEX `idx_role`   (`role`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 2. Sessions table ────────────────────────────────
-- DB-backed sessions complement PHP's native sessions.
-- Optional: use only if you want server-side session revocation.
CREATE TABLE IF NOT EXISTS `csap_sessions` (
    `token`      VARCHAR(64)  NOT NULL,
    `user_id`    INT          NOT NULL,
    `ip_address` VARCHAR(45)           DEFAULT NULL,
    `user_agent` VARCHAR(255)          DEFAULT NULL,
    `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` DATETIME     NOT NULL,
    PRIMARY KEY (`token`),
    INDEX `idx_user_id` (`user_id`),
    CONSTRAINT `fk_sessions_user`
        FOREIGN KEY (`user_id`) REFERENCES `csap_users`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 3. Audit log ─────────────────────────────────────
-- Records sensitive actions: add, modify, delete, promote
CREATE TABLE IF NOT EXISTS `csap_audit_log` (
    `id`          INT           NOT NULL AUTO_INCREMENT,
    `actor_id`    INT                    DEFAULT NULL,  -- who performed the action
    `action`      VARCHAR(60)   NOT NULL,               -- e.g. 'user.create', 'user.role_change'
    `target_id`   INT                    DEFAULT NULL,  -- which user was affected
    `detail`      TEXT                   DEFAULT NULL,  -- JSON blob of before/after
    `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_actor`  (`actor_id`),
    INDEX `idx_action` (`action`),
    CONSTRAINT `fk_audit_actor`
        FOREIGN KEY (`actor_id`) REFERENCES `csap_users`(`id`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 4. Seed: default admin account ───────────────────
-- IMPORTANT: Change this password immediately after first login!
-- Default credentials:
--   Email   : admin@csap.purdue.edu
--   Password: Admin1234!   (bcrypt hash below)
--
-- To regenerate the hash yourself (PHP CLI):
--   php -r "echo password_hash('Admin1234!', PASSWORD_BCRYPT);"

-- ── 5. Events table ──────────────────────────────────
-- Managed by admins / superusers from the portal dashboard.
CREATE TABLE IF NOT EXISTS `csap_events` (
    `id`                    INT            NOT NULL AUTO_INCREMENT,
    `title`                 VARCHAR(200)   NOT NULL,
    `description`           TEXT,
    `category`              ENUM('social','cultural','academic','food','professional','fundraiser')
                                           NOT NULL DEFAULT 'social',
    `location`              VARCHAR(200),
    `event_date`            DATETIME,
    `has_entry_ticket`      TINYINT(1)     NOT NULL DEFAULT 0,
    `has_food_ticket`       TINYINT(1)     NOT NULL DEFAULT 0,
    `registration_closes_at` DATETIME               DEFAULT NULL,
    `status`                ENUM('active','closed','cancelled')
                                           NOT NULL DEFAULT 'active',
    `created_by`            INT                     DEFAULT NULL,
    `created_at`            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_status`     (`status`),
    INDEX `idx_event_date` (`event_date`),
    CONSTRAINT `fk_events_creator`
        FOREIGN KEY (`created_by`) REFERENCES `csap_users`(`id`)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 6. Registrations table ────────────────────────────
-- One row per attendee per event.
-- UNIQUE KEY (event_id, puid) prevents duplicate registration.
CREATE TABLE IF NOT EXISTS `csap_registrations` (
    `id`            INT            NOT NULL AUTO_INCREMENT,
    `event_id`      INT            NOT NULL,
    `puid`          CHAR(10)       NOT NULL,
    `first_name`    VARCHAR(100)   NOT NULL,
    `last_name`     VARCHAR(100)   NOT NULL,
    `guests`        TINYINT        NOT NULL DEFAULT 0,  -- 0-5 additional guests
    `entry_ticket`  TINYINT(1)     NOT NULL DEFAULT 0,
    `food_ticket`   TINYINT(1)     NOT NULL DEFAULT 0,
    `checked_in`    TINYINT(1)     NOT NULL DEFAULT 0,
    `checked_in_at` DATETIME                DEFAULT NULL,
    `created_at`    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_event_puid` (`event_id`, `puid`),
    INDEX `idx_puid`     (`puid`),
    INDEX `idx_event_id` (`event_id`),
    CONSTRAINT `fk_reg_event`
        FOREIGN KEY (`event_id`) REFERENCES `csap_events`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ── 7. Seed: default admin account ───────────────────
INSERT IGNORE INTO `csap_users`
    (`name`, `email`, `password_hash`, `role`, `status`)
VALUES (
    'CSAP Admin',
    'admin@csap.purdue.edu',
    '$2y$12$X9bCZ1VmOEVLHBxv2QZKOueFGqMj7xt8VvOFUh8r7gOzKkM0LWbKS',
    'admin',
    'active'
);
