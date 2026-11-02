CREATE TABLE IF NOT EXISTS users (
 id CHAR(36) CHARACTER SET ascii PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) CHARACTER SET ascii NOT NULL,
 role ENUM('super_admin','team') NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 auth_version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at BIGINT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
 token_hash CHAR(64) CHARACTER SET ascii PRIMARY KEY,
 user_id CHAR(36) CHARACTER SET ascii NOT NULL,
 auth_version INT UNSIGNED NOT NULL,
 created_at BIGINT NOT NULL,
 last_seen BIGINT NOT NULL,
 expires_at BIGINT NOT NULL,
 INDEX sessions_user (user_id),
 INDEX sessions_expiry (expires_at),
 FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_limits (
 bucket CHAR(64) CHARACTER SET ascii PRIMARY KEY,
 attempts INT UNSIGNED NOT NULL,
 window_end BIGINT NOT NULL,
 INDEX limits_expiry (window_end)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_events (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 actor_id CHAR(36) CHARACTER SET ascii NULL,
 target_id CHAR(36) CHARACTER SET ascii NULL,
 action VARCHAR(60) NOT NULL,
 created_at BIGINT NOT NULL,
 INDEX events_time (created_at),
 FOREIGN KEY (actor_id) REFERENCES users(id),
 FOREIGN KEY (target_id) REFERENCES users(id)
) ENGINE=InnoDB;
