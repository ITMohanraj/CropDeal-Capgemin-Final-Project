package com.cropdeal.gateway.dto;

import java.io.Serializable;

public class NotificationQueueRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    private String recipient;
    private String userId;
    private String title;
    private String type;
    private String message;
    private Long orderId;

    public NotificationQueueRequest() {
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
