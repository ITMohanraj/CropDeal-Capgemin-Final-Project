package com.cropdeal.auth.service;

import com.cropdeal.auth.dto.*;
import com.cropdeal.auth.enums.Role;
import com.cropdeal.auth.enums.UserStatus;

public interface AuthService {

    MessageResponse register(RegisterRequest request);

    LoginResponse login(LoginRequest request);

    LoginResponse loginWithFacebook(FacebookLoginRequest request);

    SocialAuthResponse processFacebookAuth(FacebookLoginRequest request);

    SocialAuthResponse linkFacebookAccount(SocialLinkRequest request);

    SocialAuthResponse registerFacebookUser(SocialRegisterRequest request);

    String getFacebookAuthorizationUrl(String redirectUri, String state);

    LoginResponse processOAuth2User(String providerId, String email, String name, Role role);

    MessageResponse logout(String token);

    MessageResponse forgotPassword(ForgotPasswordRequest request);

    MessageResponse resetPassword(ResetPasswordRequest request);

    MessageResponse verifyOtp(String otp);

    MessageResponse changePassword(ChangePasswordRequest request);

    MessageResponse updateUserStatus(
            Long userId,
            UserStatus status
    );
}