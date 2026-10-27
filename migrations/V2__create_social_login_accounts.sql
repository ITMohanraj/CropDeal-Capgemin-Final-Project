-- =========================================================================
-- CropDeal Database Migration: V2__create_social_login_accounts.sql
-- Purpose: Dedicated external identity storage for Facebook OAuth
-- Service: auth-service (cropdeal_auth_db)
-- =========================================================================

CREATE TABLE IF NOT EXISTS social_login_accounts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cropdeal_user_id BIGINT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    provider_email VARCHAR(150) NULL,
    provider_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    provider_display_name VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL,
    CONSTRAINT uk_social_provider_user UNIQUE (provider, provider_user_id),
    CONSTRAINT fk_social_user FOREIGN KEY (cropdeal_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_social_user_id ON social_login_accounts (cropdeal_user_id);
CREATE INDEX idx_social_provider_lookup ON social_login_accounts (provider, provider_user_id);
