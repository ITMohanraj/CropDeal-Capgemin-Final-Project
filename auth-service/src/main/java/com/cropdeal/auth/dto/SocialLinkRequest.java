package com.cropdeal.auth.dto;

import jakarta.validation.constraints.NotBlank;

public class SocialLinkRequest {

    @NotBlank(message = "Linking token is required")
    private String linkingToken;

    @NotBlank(message = "Password is required to verify account ownership")
    private String password;

    public SocialLinkRequest() {
    }

    public SocialLinkRequest(String linkingToken, String password) {
        this.linkingToken = linkingToken;
        this.password = password;
    }

    public String getLinkingToken() {
        return linkingToken;
    }

    public void setLinkingToken(String linkingToken) {
        this.linkingToken = linkingToken;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
