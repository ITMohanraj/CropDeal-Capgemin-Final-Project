package com.cropdeal.auth.controller;

import com.cropdeal.auth.dto.*;
import com.cropdeal.auth.enums.Role;
import com.cropdeal.auth.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerFacebookTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("POST /api/auth/facebook - successfully returns JWT login response when linked")
    void testLoginWithFacebook_Endpoint_Success() throws Exception {
        FacebookLoginRequest request = new FacebookLoginRequest("test_fb_token_123", Role.DEALER);
        SocialAuthResponse mockResponse = SocialAuthResponse.success(
                42L,
                "dealer@cropdeal.com",
                "Dealer John",
                "DEALER",
                "sample.jwt.token",
                "FACEBOOK"
        );

        when(authService.processFacebookAuth(any(FacebookLoginRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.userId").value(42))
                .andExpect(jsonPath("$.email").value("dealer@cropdeal.com"))
                .andExpect(jsonPath("$.role").value("DEALER"))
                .andExpect(jsonPath("$.token").value("sample.jwt.token"));
    }

    @Test
    @DisplayName("POST /api/auth/facebook - returns LINK_REQUIRED when CropDeal account has matching email")
    void testLoginWithFacebook_Endpoint_LinkRequired() throws Exception {
        FacebookLoginRequest request = new FacebookLoginRequest("test_fb_token_123", null);
        SocialAuthResponse mockResponse = SocialAuthResponse.linkRequired(
                "token.for.linking",
                "matching@cropdeal.com",
                "FACEBOOK",
                "fb_101",
                "John Doe"
        );

        when(authService.processFacebookAuth(any(FacebookLoginRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LINK_REQUIRED"))
                .andExpect(jsonPath("$.email").value("matching@cropdeal.com"))
                .andExpect(jsonPath("$.linkingToken").value("token.for.linking"));
    }

    @Test
    @DisplayName("POST /api/auth/facebook - returns REGISTRATION_REQUIRED for new Facebook user")
    void testLoginWithFacebook_Endpoint_RegistrationRequired() throws Exception {
        FacebookLoginRequest request = new FacebookLoginRequest("test_fb_token_123", null);
        SocialAuthResponse mockResponse = SocialAuthResponse.registrationRequired(
                "token.for.registration",
                "newuser@facebook.com",
                "FACEBOOK",
                "fb_202",
                "New Facebook User"
        );

        when(authService.processFacebookAuth(any(FacebookLoginRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REGISTRATION_REQUIRED"))
                .andExpect(jsonPath("$.registrationToken").value("token.for.registration"));
    }

    @Test
    @DisplayName("POST /api/auth/facebook - returns 400 Bad Request when validation fails")
    void testLoginWithFacebook_Endpoint_ValidationError() throws Exception {
        FacebookLoginRequest request = new FacebookLoginRequest("", null);
        when(authService.processFacebookAuth(any(FacebookLoginRequest.class)))
                .thenThrow(new IllegalArgumentException("Either Facebook accessToken or authorization code is required"));

        mockMvc.perform(post("/api/auth/facebook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/auth/facebook/link - successfully links account")
    void testLinkFacebookAccount_Endpoint_Success() throws Exception {
        SocialLinkRequest request = new SocialLinkRequest("valid.link.token", "Secret@123");
        SocialAuthResponse mockResponse = SocialAuthResponse.success(
                10L,
                "farmer@cropdeal.com",
                "Farmer Dave",
                "FARMER",
                "linked.jwt.token",
                "FACEBOOK"
        );

        when(authService.linkFacebookAccount(any(SocialLinkRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/auth/facebook/link")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.token").value("linked.jwt.token"));
    }

    @Test
    @DisplayName("POST /api/auth/facebook/register - successfully registers new user")
    void testRegisterFacebookUser_Endpoint_Success() throws Exception {
        SocialRegisterRequest request = new SocialRegisterRequest(
                "valid.reg.token",
                Role.FARMER,
                "New Farmer",
                "newfarmer@cropdeal.com",
                "9876543210"
        );
        SocialAuthResponse mockResponse = SocialAuthResponse.success(
                20L,
                "newfarmer@cropdeal.com",
                "New Farmer",
                "FARMER",
                "registered.jwt.token",
                "FACEBOOK"
        );

        when(authService.registerFacebookUser(any(SocialRegisterRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/auth/facebook/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.token").value("registered.jwt.token"));
    }

    @Test
    @DisplayName("GET /api/auth/facebook/start - returns OAuth authorization dialog URL")
    void testGetFacebookStartUrl_Endpoint() throws Exception {
        when(authService.getFacebookAuthorizationUrl(any(), any()))
                .thenReturn("https://www.facebook.com/v21.0/dialog/oauth?client_id=123");

        mockMvc.perform(get("/api/auth/facebook/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url").value("https://www.facebook.com/v21.0/dialog/oauth?client_id=123"));
    }
}
