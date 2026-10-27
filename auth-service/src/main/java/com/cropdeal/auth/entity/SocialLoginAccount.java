package com.cropdeal.auth.entity;

import com.cropdeal.auth.enums.AuthProvider;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "social_login_accounts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_social_provider_user",
                        columnNames = {"provider", "provider_user_id"}
                )
        },
        indexes = {
                @Index(name = "idx_social_user_id", columnList = "cropdeal_user_id"),
                @Index(name = "idx_social_provider_lookup", columnList = "provider, provider_user_id")
        }
)
public class SocialLoginAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cropdeal_user_id")
    private Long cropDealUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AuthProvider provider;

    @Column(name = "provider_user_id", nullable = false, length = 100)
    private String providerUserId;

    @Column(name = "provider_email", length = 150)
    private String providerEmail;

    @Column(name = "provider_email_verified", nullable = false)
    private Boolean providerEmailVerified = false;

    @Column(name = "provider_display_name", length = 150)
    private String providerDisplayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (providerEmailVerified == null) {
            providerEmailVerified = false;
        }
        if (provider == null) {
            provider = AuthProvider.FACEBOOK;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public SocialLoginAccount() {
    }

    public SocialLoginAccount(Long cropDealUserId, AuthProvider provider, String providerUserId,
                              String providerEmail, Boolean providerEmailVerified, String providerDisplayName) {
        this.cropDealUserId = cropDealUserId;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.providerEmail = providerEmail;
        this.providerEmailVerified = providerEmailVerified != null ? providerEmailVerified : false;
        this.providerDisplayName = providerDisplayName;
        this.lastLoginAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getCropDealUserId() {
        return cropDealUserId;
    }

    public void setCropDealUserId(Long cropDealUserId) {
        this.cropDealUserId = cropDealUserId;
    }

    public AuthProvider getProvider() {
        return provider;
    }

    public void setProvider(AuthProvider provider) {
        this.provider = provider;
    }

    public String getProviderUserId() {
        return providerUserId;
    }

    public void setProviderUserId(String providerUserId) {
        this.providerUserId = providerUserId;
    }

    public String getProviderEmail() {
        return providerEmail;
    }

    public void setProviderEmail(String providerEmail) {
        this.providerEmail = providerEmail;
    }

    public Boolean getProviderEmailVerified() {
        return providerEmailVerified;
    }

    public void setProviderEmailVerified(Boolean providerEmailVerified) {
        this.providerEmailVerified = providerEmailVerified;
    }

    public String getProviderDisplayName() {
        return providerDisplayName;
    }

    public void setProviderDisplayName(String providerDisplayName) {
        this.providerDisplayName = providerDisplayName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
