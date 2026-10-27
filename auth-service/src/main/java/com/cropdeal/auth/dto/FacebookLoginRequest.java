package com.cropdeal.auth.dto;

import com.cropdeal.auth.enums.Role;

public class FacebookLoginRequest {

    private String accessToken;
    private String code;
    private String redirectUri;
    private Role role;
    private String email;
    private String name;

    public FacebookLoginRequest() {
    }

    public FacebookLoginRequest(String accessToken) {
        this.accessToken = accessToken;
    }

    public FacebookLoginRequest(String accessToken, Role role) {
        this.accessToken = accessToken;
        this.role = role;
    }

    public FacebookLoginRequest(String accessToken, Role role, String email, String name) {
        this.accessToken = accessToken;
        this.role = role;
        this.email = email;
        this.name = name;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getRedirectUri() {
        return redirectUri;
    }

    public void setRedirectUri(String redirectUri) {
        this.redirectUri = redirectUri;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
