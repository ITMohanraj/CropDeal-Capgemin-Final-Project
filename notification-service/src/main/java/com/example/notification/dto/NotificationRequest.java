package com.example.notification.dto;

import jakarta.validation.constraints.NotBlank;

public class NotificationRequest {

    @NotBlank
    private String recipient;

    private String title;

    @NotBlank
    private String type;

    @NotBlank
    private String message;

    private Long orderId;

    private String userId;

    public NotificationRequest() {
    }

    public String getRecipient() {
        return recipient != null && !recipient.isBlank() ? recipient : userId;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
}
