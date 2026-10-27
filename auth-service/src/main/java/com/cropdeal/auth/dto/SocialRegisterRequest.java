package com.cropdeal.auth.dto;

import com.cropdeal.auth.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class SocialRegisterRequest {

    @NotBlank(message = "Registration token is required")
    private String registrationToken;

    @NotNull(message = "Role is required")
    private Role role;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[6-9][0-9]{9}$", message = "Please provide a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9")
    private String phone;

    public SocialRegisterRequest() {
    }

    public SocialRegisterRequest(String registrationToken, Role role, String fullName, String email, String phone) {
        this.registrationToken = registrationToken;
        this.role = role;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
    }

    public String getRegistrationToken() {
        return registrationToken;
    }

    public void setRegistrationToken(String registrationToken) {
        this.registrationToken = registrationToken;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
