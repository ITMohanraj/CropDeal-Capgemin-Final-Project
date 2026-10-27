package com.cropdeal.auth.service;

import com.cropdeal.auth.client.UserServiceClient;
import com.cropdeal.auth.dto.*;
import com.cropdeal.auth.entity.SocialLoginAccount;
import com.cropdeal.auth.entity.User;
import com.cropdeal.auth.enums.AuthProvider;
import com.cropdeal.auth.enums.Role;
import com.cropdeal.auth.enums.UserStatus;
import com.cropdeal.auth.exception.InvalidCredentialsException;
import com.cropdeal.auth.exception.InvalidTokenException;
import com.cropdeal.auth.exception.UserAlreadyExistsException;
import com.cropdeal.auth.repository.SocialLoginAccountRepository;
import com.cropdeal.auth.repository.UserRepository;
import com.cropdeal.auth.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.impl.DefaultClaims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceFacebookTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SocialLoginAccountRepository socialLoginAccountRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private UserServiceClient userServiceClient;

    @Mock
    private FacebookGraphClient facebookGraphClient;

    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
                userRepository,
                passwordEncoder,
                jwtService,
                userServiceClient,
                facebookGraphClient,
                socialLoginAccountRepository
        );
    }

    // =========================================================================
    // Test 1: Existing linked Facebook identity successfully logs in
    // =========================================================================
    @Test
    @DisplayName("Test 1: Existing linked Facebook identity successfully logs in")
    void test1_existingLinkedFacebookIdentity_successfullyLogsIn() {
        String token = "test_fb_linked_123";
        FacebookUserProfile profile = new FacebookUserProfile("fb_user_123", "Linked Dealer", "dealer@cropdeal.com");
        when(facebookGraphClient.getUserProfile(token)).thenReturn(profile);

        SocialLoginAccount socialAccount = new SocialLoginAccount(
                10L, AuthProvider.FACEBOOK, "fb_user_123", "dealer@cropdeal.com", true, "Linked Dealer"
        );
        when(socialLoginAccountRepository.findByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_user_123"))
                .thenReturn(Optional.of(socialAccount));

        User user = new User();
        user.setId(10L);
        user.setEmail("dealer@cropdeal.com");
        user.setUsername("dealer_mohan");
        user.setRole(Role.DEALER);
        user.setStatus(UserStatus.ACTIVE);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));
        when(jwtService.generateToken(user)).thenReturn("jwt.token.linked.user");

        FacebookLoginRequest request = new FacebookLoginRequest(token);
        SocialAuthResponse response = authService.processFacebookAuth(request);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getStatus());
        assertEquals("jwt.token.linked.user", response.getToken());
        assertEquals(10L, response.getUserId());
        assertEquals("ROLE_DEALER", response.getRole());
        verify(socialLoginAccountRepository, times(1)).save(socialAccount);
    }

    // =========================================================================
    // Test 2: New Facebook identity is directed to role selection
    // =========================================================================
    @Test
    @DisplayName("Test 2: New Facebook identity is directed to role selection")
    void test2_newFacebookIdentity_isDirectedToRoleSelection() {
        String token = "test_fb_new_456";
        FacebookUserProfile profile = new FacebookUserProfile("fb_user_new", "New Farmer", "newfarmer@facebook.com");
        when(facebookGraphClient.getUserProfile(token)).thenReturn(profile);

        when(socialLoginAccountRepository.findByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_user_new"))
                .thenReturn(Optional.empty());
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.FACEBOOK, "fb_user_new"))
                .thenReturn(Optional.empty());
        when(userRepository.findByEmail("newfarmer@facebook.com"))
                .thenReturn(Optional.empty());
        when(jwtService.generateSocialRegistrationToken("fb_user_new", "newfarmer@facebook.com", "New Farmer", "FACEBOOK"))
                .thenReturn("reg_token_xyz");

        FacebookLoginRequest request = new FacebookLoginRequest(token);
        SocialAuthResponse response = authService.processFacebookAuth(request);

        assertNotNull(response);
        assertEquals("REGISTRATION_REQUIRED", response.getStatus());
        assertEquals("reg_token_xyz", response.getRegistrationToken());
        assertEquals("newfarmer@facebook.com", response.getEmail());
        assertEquals("New Farmer", response.getProviderDisplayName());
    }

    // =========================================================================
    // Test 3: New user completes registration and gets the correct role
    // =========================================================================
    @Test
    @DisplayName("Test 3: New user completes registration and gets the correct role")
    void test3_newUserCompletesRegistration_andGetsCorrectRole() {
        String regToken = "valid_reg_token";
        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("sub", "fb_user_new");
        claimsMap.put("provider", "FACEBOOK");
        claimsMap.put("email", "newfarmer@cropdeal.com");
        claimsMap.put("name", "New Farmer User");
        Claims claims = new DefaultClaims(claimsMap);

        when(jwtService.parseAndValidateSocialToken(regToken, "SOCIAL_REGISTRATION")).thenReturn(claims);
        when(socialLoginAccountRepository.existsByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_user_new"))
                .thenReturn(false);
        when(userRepository.existsByEmail("newfarmer@cropdeal.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("random_hashed_pass");

        User savedUser = new User();
        savedUser.setId(77L);
        savedUser.setEmail("newfarmer@cropdeal.com");
        savedUser.setUsername("newfarmer");
        savedUser.setRole(Role.FARMER);
        savedUser.setStatus(UserStatus.ACTIVE);

        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(savedUser)).thenReturn("jwt.token.farmer");

        SocialRegisterRequest request = new SocialRegisterRequest(
                regToken, Role.FARMER, "New Farmer User", "newfarmer@cropdeal.com", "9876543210"
        );

        SocialAuthResponse response = authService.registerFacebookUser(request);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getStatus());
        assertEquals("jwt.token.farmer", response.getToken());
        assertEquals("ROLE_FARMER", response.getRole());
        verify(socialLoginAccountRepository, times(1)).save(any(SocialLoginAccount.class));
        verify(userServiceClient, times(1)).createProfile(any());
    }

    // =========================================================================
    // Test 4: Existing CropDeal account can securely link Facebook
    // =========================================================================
    @Test
    @DisplayName("Test 4: Existing CropDeal account can securely link Facebook")
    void test4_existingCropDealAccount_canSecurelyLinkFacebook() {
        String linkToken = "valid_link_token";
        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("sub", "fb_user_888");
        claimsMap.put("existingUserId", 50L);
        claimsMap.put("provider", "FACEBOOK");
        claimsMap.put("email", "existing@cropdeal.com");
        claimsMap.put("name", "Existing User");
        Claims claims = new DefaultClaims(claimsMap);

        when(jwtService.parseAndValidateSocialToken(linkToken, "SOCIAL_LINKING")).thenReturn(claims);

        User existingUser = new User();
        existingUser.setId(50L);
        existingUser.setEmail("existing@cropdeal.com");
        existingUser.setPassword("encoded_user_password");
        existingUser.setRole(Role.DEALER);
        existingUser.setStatus(UserStatus.ACTIVE);

        when(userRepository.findById(50L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("UserPassword@123", "encoded_user_password")).thenReturn(true);
        when(socialLoginAccountRepository.existsByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_user_888"))
                .thenReturn(false);
        when(jwtService.generateToken(existingUser)).thenReturn("jwt.token.linked");

        SocialLinkRequest request = new SocialLinkRequest(linkToken, "UserPassword@123");
        SocialAuthResponse response = authService.linkFacebookAccount(request);

        assertNotNull(response);
        assertEquals("SUCCESS", response.getStatus());
        assertEquals("jwt.token.linked", response.getToken());
        verify(socialLoginAccountRepository, times(1)).save(any(SocialLoginAccount.class));
    }

    // =========================================================================
    // Test 5: Matching email alone cannot cause unsafe account linking
    // =========================================================================
    @Test
    @DisplayName("Test 5: Matching email alone cannot cause unsafe account linking")
    void test5_matchingEmailAlone_cannotCauseUnsafeAccountLinking() {
        String token = "test_fb_matching_email";
        FacebookUserProfile profile = new FacebookUserProfile("fb_unlinked_id", "Same Email User", "someone@cropdeal.com");
        when(facebookGraphClient.getUserProfile(token)).thenReturn(profile);

        when(socialLoginAccountRepository.findByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_unlinked_id"))
                .thenReturn(Optional.empty());
        when(userRepository.findByAuthProviderAndProviderId(AuthProvider.FACEBOOK, "fb_unlinked_id"))
                .thenReturn(Optional.empty());

        User existingUser = new User();
        existingUser.setId(101L);
        existingUser.setEmail("someone@cropdeal.com");
        when(userRepository.findByEmail("someone@cropdeal.com")).thenReturn(Optional.of(existingUser));

        when(jwtService.generateSocialLinkingToken(101L, "fb_unlinked_id", "someone@cropdeal.com", "Same Email User", "FACEBOOK"))
                .thenReturn("linking_token_required");

        FacebookLoginRequest request = new FacebookLoginRequest(token);
        SocialAuthResponse response = authService.processFacebookAuth(request);

        assertNotNull(response);
        assertEquals("LINK_REQUIRED", response.getStatus());
        assertNull(response.getToken(), "Token must not be issued before explicit password verification!");
        assertEquals("linking_token_required", response.getLinkingToken());

        // And verify account linking fails if password is wrong
        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("sub", "fb_unlinked_id");
        claimsMap.put("existingUserId", 101L);
        claimsMap.put("provider", "FACEBOOK");
        claimsMap.put("email", "someone@cropdeal.com");
        claimsMap.put("name", "Same Email User");
        Claims claims = new DefaultClaims(claimsMap);

        when(jwtService.parseAndValidateSocialToken("linking_token_required", "SOCIAL_LINKING")).thenReturn(claims);
        when(userRepository.findById(101L)).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.matches("WrongPassword", existingUser.getPassword())).thenReturn(false);

        SocialLinkRequest linkReq = new SocialLinkRequest("linking_token_required", "WrongPassword");
        assertThrows(InvalidCredentialsException.class, () -> authService.linkFacebookAccount(linkReq));
    }

    // =========================================================================
    // Test 6: Invalid or expired Facebook token is rejected
    // =========================================================================
    @Test
    @DisplayName("Test 6: Invalid or expired Facebook token is rejected")
    void test6_invalidOrExpiredFacebookToken_isRejected() {
        FacebookLoginRequest emptyRequest = new FacebookLoginRequest("");
        assertThrows(InvalidTokenException.class, () -> authService.processFacebookAuth(emptyRequest));

        String invalidToken = "expired_token_123";
        when(facebookGraphClient.getUserProfile(invalidToken))
                .thenThrow(new InvalidTokenException("Facebook access token is invalid or expired"));

        FacebookLoginRequest request = new FacebookLoginRequest(invalidToken);
        assertThrows(InvalidTokenException.class, () -> authService.processFacebookAuth(request));
    }

    // =========================================================================
    // Test 7: A forged Facebook user ID is rejected
    // =========================================================================
    @Test
    @DisplayName("Test 7: A forged Facebook user ID is rejected")
    void test7_forgedFacebookUserId_isRejected() {
        // Token without Facebook Graph API authentication is rejected by GraphClient
        when(facebookGraphClient.getUserProfile("forged_token"))
                .thenThrow(new InvalidTokenException("Invalid Facebook access token: no identity returned"));

        FacebookLoginRequest request = new FacebookLoginRequest("forged_token");
        assertThrows(InvalidTokenException.class, () -> authService.processFacebookAuth(request));

        // Tampered registration token is rejected by JwtService
        when(jwtService.parseAndValidateSocialToken("tampered_reg_token", "SOCIAL_REGISTRATION"))
                .thenThrow(new InvalidTokenException("Invalid token type or signature mismatch"));

        SocialRegisterRequest regReq = new SocialRegisterRequest(
                "tampered_reg_token", Role.DEALER, "Hacker", "hacker@evil.com", "9876543210"
        );
        assertThrows(InvalidTokenException.class, () -> authService.registerFacebookUser(regReq));
    }

    // =========================================================================
    // Test 8: Duplicate Facebook identities are prevented
    // =========================================================================
    @Test
    @DisplayName("Test 8: Duplicate Facebook identities are prevented")
    void test8_duplicateFacebookIdentities_arePrevented() {
        String regToken = "duplicate_token";
        Map<String, Object> claimsMap = new HashMap<>();
        claimsMap.put("sub", "already_linked_fb_id");
        claimsMap.put("provider", "FACEBOOK");
        claimsMap.put("email", "dup@cropdeal.com");
        Claims claims = new DefaultClaims(claimsMap);

        when(jwtService.parseAndValidateSocialToken(regToken, "SOCIAL_REGISTRATION")).thenReturn(claims);
        when(socialLoginAccountRepository.existsByProviderAndProviderUserId(AuthProvider.FACEBOOK, "already_linked_fb_id"))
                .thenReturn(true);

        SocialRegisterRequest regReq = new SocialRegisterRequest(
                regToken, Role.DEALER, "Duplicate User", "dup@cropdeal.com", "9876543210"
        );
        assertThrows(UserAlreadyExistsException.class, () -> authService.registerFacebookUser(regReq));
    }

    // =========================================================================
    // Test 9: Public registration cannot create an Admin account
    // =========================================================================
    @Test
    @DisplayName("Test 9: Public registration cannot create an Admin account")
    void test9_publicRegistration_cannotCreateAdminAccount() {
        SocialRegisterRequest adminReq = new SocialRegisterRequest(
                "any_token", Role.ADMIN, "Fake Admin", "admin@cropdeal.com", "9876543210"
        );
        assertThrows(AccessDeniedException.class, () -> authService.registerFacebookUser(adminReq));
    }

    // =========================================================================
    // Test 10: Cancelled OAuth and provider errors are handled
    // =========================================================================
    @Test
    @DisplayName("Test 10: Cancelled OAuth and provider errors are handled")
    void test10_cancelledOAuthAndProviderErrors_areHandled() {
        FacebookLoginRequest nullRequest = null;
        assertThrows(InvalidTokenException.class, () -> authService.processFacebookAuth(nullRequest));

        FacebookLoginRequest emptyRequest = new FacebookLoginRequest(null);
        assertThrows(InvalidTokenException.class, () -> authService.processFacebookAuth(emptyRequest));
    }

    // =========================================================================
    // Test 11: Facebook login does not break normal CropDeal email/password login
    // =========================================================================
    @Test
    @DisplayName("Test 11: Facebook login does not break normal CropDeal email/password login")
    void test11_facebookLogin_doesNotBreakNormalCropDealEmailPasswordLogin() {
        User user = new User();
        user.setId(1L);
        user.setEmail("regular@cropdeal.com");
        user.setPassword("encodedPassword");
        user.setRole(Role.FARMER);
        user.setStatus(UserStatus.ACTIVE);

        when(userRepository.findByEmail("regular@cropdeal.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password@123", "encodedPassword")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt.normal.user");

        LoginRequest loginRequest = new LoginRequest("regular@cropdeal.com", "Password@123");
        LoginResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("jwt.normal.user", response.getToken());
        assertEquals("ROLE_FARMER", response.getRole());
    }

    // =========================================================================
    // Test 12: JWTs and dashboard redirects work correctly for every permitted role
    // =========================================================================
    @Test
    @DisplayName("Test 12: JWTs and dashboard redirects work correctly for every permitted role")
    void test12_jwtAndDashboardRedirects_workCorrectlyForEveryPermittedRole() {
        Role[] roles = {Role.DEALER, Role.FARMER, Role.DELIVERY_PARTNER};

        for (Role role : roles) {
            User user = new User();
            user.setId(20L);
            user.setEmail(role.name().toLowerCase() + "@cropdeal.com");
            user.setRole(role);
            user.setStatus(UserStatus.ACTIVE);

            when(jwtService.generateToken(user)).thenReturn("jwt." + role.name());

            SocialLoginAccount account = new SocialLoginAccount(
                    20L, AuthProvider.FACEBOOK, "fb_" + role.name(), user.getEmail(), true, "Role User"
            );
            when(facebookGraphClient.getUserProfile("token_" + role.name()))
                    .thenReturn(new FacebookUserProfile("fb_" + role.name(), "Role User", user.getEmail()));
            when(socialLoginAccountRepository.findByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_" + role.name()))
                    .thenReturn(Optional.of(account));
            when(userRepository.findById(20L)).thenReturn(Optional.of(user));

            SocialAuthResponse response = authService.processFacebookAuth(new FacebookLoginRequest("token_" + role.name()));

            assertNotNull(response);
            assertEquals("SUCCESS", response.getStatus());
            assertEquals("ROLE_" + role.name(), response.getRole());
            assertEquals("jwt." + role.name(), response.getToken());
        }
    }

    // =========================================================================
    // Test 13: Switching to a different Facebook account does not silently reuse an unrelated CropDeal session
    // =========================================================================
    @Test
    @DisplayName("Test 13: Switching to a different Facebook account does not silently reuse an unrelated CropDeal session")
    void test13_switchingToDifferentFacebookAccount_doesNotSilentlyReuseUnrelatedCropDealSession() {
        // Account 1
        FacebookUserProfile profileA = new FacebookUserProfile("fb_account_A", "User A", "userA@cropdeal.com");
        when(facebookGraphClient.getUserProfile("token_A")).thenReturn(profileA);
        SocialLoginAccount accountA = new SocialLoginAccount(1L, AuthProvider.FACEBOOK, "fb_account_A", "userA@cropdeal.com", true, "User A");
        when(socialLoginAccountRepository.findByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_account_A"))
                .thenReturn(Optional.of(accountA));
        User userA = new User();
        userA.setId(1L);
        userA.setEmail("userA@cropdeal.com");
        userA.setRole(Role.DEALER);
        userA.setStatus(UserStatus.ACTIVE);
        when(userRepository.findById(1L)).thenReturn(Optional.of(userA));
        when(jwtService.generateToken(userA)).thenReturn("jwt.account.A");

        SocialAuthResponse resA = authService.processFacebookAuth(new FacebookLoginRequest("token_A"));
        assertEquals(1L, resA.getUserId());
        assertEquals("userA@cropdeal.com", resA.getEmail());

        // Account 2
        FacebookUserProfile profileB = new FacebookUserProfile("fb_account_B", "User B", "userB@cropdeal.com");
        when(facebookGraphClient.getUserProfile("token_B")).thenReturn(profileB);
        SocialLoginAccount accountB = new SocialLoginAccount(2L, AuthProvider.FACEBOOK, "fb_account_B", "userB@cropdeal.com", true, "User B");
        when(socialLoginAccountRepository.findByProviderAndProviderUserId(AuthProvider.FACEBOOK, "fb_account_B"))
                .thenReturn(Optional.of(accountB));
        User userB = new User();
        userB.setId(2L);
        userB.setEmail("userB@cropdeal.com");
        userB.setRole(Role.FARMER);
        userB.setStatus(UserStatus.ACTIVE);
        when(userRepository.findById(2L)).thenReturn(Optional.of(userB));
        when(jwtService.generateToken(userB)).thenReturn("jwt.account.B");

        SocialAuthResponse resB = authService.processFacebookAuth(new FacebookLoginRequest("token_B"));
        assertEquals(2L, resB.getUserId());
        assertEquals("userB@cropdeal.com", resB.getEmail());
        assertNotEquals(resA.getUserId(), resB.getUserId());
        assertNotEquals(resA.getToken(), resB.getToken());
    }
}
