package com.cropdeal.auth.security;

import com.cropdeal.auth.dto.FacebookLoginRequest;
import com.cropdeal.auth.dto.SocialAuthResponse;
import com.cropdeal.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;

    public OAuth2AuthenticationSuccessHandler(@Lazy AuthService authService) {
        this.authService = authService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        if (authentication instanceof OAuth2AuthenticationToken oauthToken) {
            OAuth2User oAuth2User = oauthToken.getPrincipal();
            Map<String, Object> attributes = oAuth2User.getAttributes();

            String providerId = String.valueOf(attributes.get("id"));
            String name = attributes.containsKey("name") && attributes.get("name") != null 
                    ? String.valueOf(attributes.get("name")) : "Facebook User";
            String email = attributes.containsKey("email") && attributes.get("email") != null
                    ? String.valueOf(attributes.get("email")) : null;

            FacebookLoginRequest loginReq = new FacebookLoginRequest("test_fb_" + providerId, null, email, name);
            SocialAuthResponse socialResponse = authService.processFacebookAuth(loginReq);

            String redirectUrl;
            if ("SUCCESS".equals(socialResponse.getStatus())) {
                redirectUrl = "http://localhost:4200/auth/login?token=" + socialResponse.getToken()
                        + "&userId=" + socialResponse.getUserId()
                        + "&email=" + URLEncoder.encode(socialResponse.getEmail() != null ? socialResponse.getEmail() : "", StandardCharsets.UTF_8)
                        + "&role=" + URLEncoder.encode(socialResponse.getRole() != null ? socialResponse.getRole() : "ROLE_DEALER", StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8);
            } else if ("LINK_REQUIRED".equals(socialResponse.getStatus())) {
                redirectUrl = "http://localhost:4200/auth/login?status=LINK_REQUIRED"
                        + "&linkingToken=" + URLEncoder.encode(socialResponse.getLinkingToken(), StandardCharsets.UTF_8)
                        + "&email=" + URLEncoder.encode(socialResponse.getEmail() != null ? socialResponse.getEmail() : "", StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8)
                        + "&providerUserId=" + URLEncoder.encode(providerId, StandardCharsets.UTF_8);
            } else {
                redirectUrl = "http://localhost:4200/auth/login?status=REGISTRATION_REQUIRED"
                        + "&registrationToken=" + URLEncoder.encode(socialResponse.getRegistrationToken(), StandardCharsets.UTF_8)
                        + "&email=" + URLEncoder.encode(email != null ? email : "", StandardCharsets.UTF_8)
                        + "&name=" + URLEncoder.encode(name, StandardCharsets.UTF_8)
                        + "&providerUserId=" + URLEncoder.encode(providerId, StandardCharsets.UTF_8);
            }

            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
        }
    }
}
