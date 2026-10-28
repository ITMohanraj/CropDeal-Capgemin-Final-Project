package com.dto;

import java.math.BigDecimal;

public class RefundRequest {

    private Long deliveryId;
    private BigDecimal refundAmount;
    private String reason;

    public RefundRequest() {
    }

    public RefundRequest(Long deliveryId, BigDecimal refundAmount, String reason) {
        this.deliveryId = deliveryId;
        this.refundAmount = refundAmount;
        this.reason = reason;
    }

    public Long getDeliveryId() {
        return deliveryId;
    }

    public void setDeliveryId(Long deliveryId) {
        this.deliveryId = deliveryId;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(BigDecimal refundAmount) {
        this.refundAmount = refundAmount;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
