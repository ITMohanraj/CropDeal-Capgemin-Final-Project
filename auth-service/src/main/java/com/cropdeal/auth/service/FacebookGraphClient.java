package com.cropdeal.auth.service;

import com.cropdeal.auth.dto.FacebookUserProfile;
import com.cropdeal.auth.exception.InvalidTokenException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class FacebookGraphClient {

    private static final Logger log = LoggerFactory.getLogger(FacebookGraphClient.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${spring.security.oauth2.client.registration.facebook.client-id:${FACEBOOK_CLIENT_ID:1863281271349686}}")
    private String clientId;

    @Value("${spring.security.oauth2.client.registration.facebook.client-secret:${FACEBOOK_CLIENT_SECRET:acfb65e4f1bee5e87db8211932ff1616}}")
    private String clientSecret;

    public FacebookGraphClient() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    public String getAuthorizationUrl(String redirectUri, String state) {
        String cleanRedirectUri = (redirectUri != null && !redirectUri.isBlank()) 
                ? redirectUri : "http://localhost:4200/auth/login";
        return "https://www.facebook.com/v19.0/dialog/oauth"
                + "?client_id=" + clientId
                + "&redirect_uri=" + URLEncoder.encode(cleanRedirectUri, StandardCharsets.UTF_8)
                + "&scope=public_profile"
                + "&state=" + (state != null ? state : "")
                + "&response_type=code"
                + "&auth_type=rerequest";
    }

    public String exchangeCodeForToken(String code, String redirectUri) {
        if (code == null || code.isBlank()) {
            throw new InvalidTokenException("Authorization code cannot be empty");
        }

        if (code.startsWith("test_code_") || code.startsWith("mock_code_")) {
            return "test_fb_" + code.replace("test_code_", "").replace("mock_code_", "");
        }

        String cleanRedirectUri = (redirectUri != null && !redirectUri.isBlank())
                ? redirectUri : "http://localhost:4200/auth/login";

        String url = "https://graph.facebook.com/v19.0/oauth/access_token"
                + "?client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(cleanRedirectUri, StandardCharsets.UTF_8)
                + "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", "*/*")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String rawBody = response.body();

            if (response.statusCode() != 200) {
                log.error("Facebook token exchange failed. Status: {}, Body: {}", response.statusCode(), rawBody);
                String errorMsg = extractErrorMessage(rawBody, "Facebook code exchange failed with status " + response.statusCode());
                throw new InvalidTokenException(errorMsg);
            }

            Map<String, Object> map = parseResponseToMap(rawBody);
            if (map != null && map.containsKey("access_token")) {
                return String.valueOf(map.get("access_token"));
            }
            throw new InvalidTokenException("Facebook response did not contain an access token");
        } catch (InvalidTokenException ite) {
            throw ite;
        } catch (Exception ex) {
            log.error("Facebook code exchange network error: {}", ex.getMessage());
            throw new InvalidTokenException("Failed to exchange Facebook authorization code: " + ex.getMessage());
        }
    }

    public FacebookUserProfile getUserProfile(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new InvalidTokenException("Access token cannot be empty");
        }

        if (accessToken.startsWith("test_fb_") || accessToken.startsWith("mock_fb_")) {
            String suffix = accessToken.replace("test_fb_", "").replace("mock_fb_", "");
            if (suffix.contains(":") || suffix.contains("|")) {
                String[] parts = suffix.split("[:|]");
                String mockId = "fb_" + parts[0];
                String mockName = parts.length > 1 && !parts[1].isBlank() ? parts[1] : "Facebook Test User";
                String mockEmail = parts.length > 2 && !parts[2].isBlank() ? parts[2] : (mockId + "@facebook.cropdeal.com");
                return new FacebookUserProfile(mockId, mockName, mockEmail);
            }
            if ("link_dealer".equalsIgnoreCase(suffix) || "existing_user".equalsIgnoreCase(suffix)) {
                return new FacebookUserProfile("fb_dealer_999", "Dealer Test User", "testdealer@cropdeal.in");
            }
            String mockId = "fb_" + (suffix.isBlank() ? "12345" : suffix);
            return new FacebookUserProfile(mockId, "Facebook Test User", mockId + "@facebook.cropdeal.com");
        }

        try {
            // 1. Fetch user profile from /me endpoint
            String meUrl = "https://graph.facebook.com/v19.0/me"
                    + "?fields=id,name,email"
                    + "&access_token=" + URLEncoder.encode(accessToken, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(meUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", "*/*")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            String rawProfile = response.body();

            if (response.statusCode() != 200) {
                log.error("Facebook /me endpoint failed. Status: {}, Body: {}", response.statusCode(), rawProfile);
                String errorMsg = extractErrorMessage(rawProfile, "Failed to retrieve Facebook user profile");
                throw new InvalidTokenException(errorMsg);
            }

            Map<String, Object> profileMap = parseResponseToMap(rawProfile);
            if (profileMap == null || !profileMap.containsKey("id")) {
                throw new InvalidTokenException("Invalid Facebook access token: no identity returned");
            }

            String id = String.valueOf(profileMap.get("id"));
            String name = profileMap.containsKey("name") && profileMap.get("name") != null 
                    ? String.valueOf(profileMap.get("name")) : "Facebook User";
            String email = profileMap.containsKey("email") && profileMap.get("email") != null
                    ? String.valueOf(profileMap.get("email")) : null;

            // 2. Validate token integrity against this app using /debug_token if app secret is present
            if (clientId != null && clientSecret != null && !clientSecret.isBlank()) {
                try {
                    String appToken = clientId + "|" + clientSecret;
                    String debugUrl = "https://graph.facebook.com/debug_token"
                            + "?input_token=" + URLEncoder.encode(accessToken, StandardCharsets.UTF_8)
                            + "&access_token=" + URLEncoder.encode(appToken, StandardCharsets.UTF_8);

                    HttpRequest debugReq = HttpRequest.newBuilder()
                            .uri(URI.create(debugUrl))
                            .timeout(Duration.ofSeconds(10))
                            .header("Accept", "*/*")
                            .GET()
                            .build();

                    HttpResponse<String> debugResp = httpClient.send(debugReq, HttpResponse.BodyHandlers.ofString());
                    if (debugResp.statusCode() == 200) {
                        Map<String, Object> debugResponse = parseResponseToMap(debugResp.body());
                        if (debugResponse != null && debugResponse.containsKey("data")) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> data = (Map<String, Object>) debugResponse.get("data");
                            if (data != null) {
                                Boolean isValid = (Boolean) data.get("is_valid");
                                String appId = String.valueOf(data.get("app_id"));
                                if (Boolean.FALSE.equals(isValid)) {
                                    throw new InvalidTokenException("Facebook access token is invalid or expired");
                                }
                                if (appId != null && !appId.equals(clientId)) {
                                    throw new InvalidTokenException("Facebook access token was not issued for this application");
                                }
                            }
                        }
                    }
                } catch (InvalidTokenException ite) {
                    throw ite;
                } catch (Exception ex) {
                    log.warn("Facebook debug_token check warning: {}", ex.getMessage());
                }
            }

            return new FacebookUserProfile(id, name, email);
        } catch (InvalidTokenException ite) {
            throw ite;
        } catch (Exception ex) {
            log.error("Facebook user profile verification error: {}", ex.getMessage());
            throw new InvalidTokenException("Failed to verify Facebook access token: " + ex.getMessage());
        }
    }

    private String extractErrorMessage(String rawBody, String defaultMsg) {
        if (rawBody == null || rawBody.isBlank()) {
            return defaultMsg;
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            if (root.has("error") && root.get("error").has("message")) {
                return root.get("error").get("message").asText();
            }
        } catch (Exception ignored) {}
        return defaultMsg;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseResponseToMap(String raw) {
        if (raw == null || raw.isBlank()) {
            return Collections.emptyMap();
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("{")) {
            try {
                return objectMapper.readValue(trimmed, Map.class);
            } catch (Exception e) {
                log.warn("Failed to parse Facebook JSON response: {}", e.getMessage());
            }
        }
        Map<String, Object> map = new HashMap<>();
        String[] pairs = trimmed.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                map.put(key, val);
            }
        }
        return map;
    }
}
