package com.cropdeal.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SocialAuthResponse {

    private String status; // "SUCCESS", "LINK_REQUIRED", "REGISTRATION_REQUIRED"
    private String message;
    private Long userId;
    private String email;
    private String username;
    private String role;
    private String token;
    private String linkingToken;
    private String registrationToken;
    private String provider;
    private String providerUserId;
    private String providerDisplayName;

    public SocialAuthResponse() {
    }

    public static SocialAuthResponse success(Long userId, String email, String username, String role, String token, String provider) {
        SocialAuthResponse res = new SocialAuthResponse();
        res.setStatus("SUCCESS");
        res.setMessage("Authenticated successfully");
        res.setUserId(userId);
        res.setEmail(email);
        res.setUsername(username);
        res.setRole(role);
        res.setToken(token);
        res.setProvider(provider);
        return res;
    }

    public static SocialAuthResponse linkRequired(String linkingToken, String email, String provider, String providerUserId, String providerDisplayName) {
        SocialAuthResponse res = new SocialAuthResponse();
        res.setStatus("LINK_REQUIRED");
        res.setMessage("An existing CropDeal account was found with your email. Please verify your CropDeal password to securely link your Facebook account.");
        res.setLinkingToken(linkingToken);
        res.setEmail(email);
        res.setProvider(provider);
        res.setProviderUserId(providerUserId);
        res.setProviderDisplayName(providerDisplayName);
        return res;
    }

    public static SocialAuthResponse registrationRequired(String registrationToken, String email, String provider, String providerUserId, String providerDisplayName) {
        SocialAuthResponse res = new SocialAuthResponse();
        res.setStatus("REGISTRATION_REQUIRED");
        res.setMessage("Please complete your CropDeal profile and select your role to continue.");
        res.setRegistrationToken(registrationToken);
        res.setEmail(email);
        res.setProvider(provider);
        res.setProviderUserId(providerUserId);
        res.setProviderDisplayName(providerDisplayName);
        return res;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getLinkingToken() {
        return linkingToken;
    }

    public void setLinkingToken(String linkingToken) {
        this.linkingToken = linkingToken;
    }

    public String getRegistrationToken() {
        return registrationToken;
    }

    public void setRegistrationToken(String registrationToken) {
        this.registrationToken = registrationToken;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderUserId() {
        return providerUserId;
    }

    public void setProviderUserId(String providerUserId) {
        this.providerUserId = providerUserId;
    }

    public String getProviderDisplayName() {
        return providerDisplayName;
    }

    public void setProviderDisplayName(String providerDisplayName) {
        this.providerDisplayName = providerDisplayName;
    }
}
