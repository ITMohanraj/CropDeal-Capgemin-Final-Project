package com.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_saga_instances")
public class OrderSagaInstance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String sagaId;

    @Column(nullable = false)
    private Long orderId;

    private String currentStep;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private SagaStatus status;

    private Long cropId;

    private Integer quantity;

    private Long dealerId;

    private Long farmerId;

    private BigDecimal amount;

    private String paymentMethod;

    private Long paymentId;

    private boolean cropStockDeducted;

    private boolean walletDebited;

    private boolean paymentCompleted;

    private boolean cropStockRestored;

    private boolean walletRefunded;

    private boolean paymentRefunded;

    @Column(columnDefinition = "TEXT")
    private String failureReason;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) {
            status = SagaStatus.STARTED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public OrderSagaInstance() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSagaId() {
        return sagaId;
    }

    public void setSagaId(String sagaId) {
        this.sagaId = sagaId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }

    public String getCurrentStep() {
        return currentStep;
    }

    public void setCurrentStep(String currentStep) {
        this.currentStep = currentStep;
    }

    public SagaStatus getStatus() {
        return status;
    }

    public void setStatus(SagaStatus status) {
        this.status = status;
    }

    public Long getCropId() {
        return cropId;
    }

    public void setCropId(Long cropId) {
        this.cropId = cropId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Long getDealerId() {
        return dealerId;
    }

    public void setDealerId(Long dealerId) {
        this.dealerId = dealerId;
    }

    public Long getFarmerId() {
        return farmerId;
    }

    public void setFarmerId(Long farmerId) {
        this.farmerId = farmerId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public boolean isCropStockDeducted() {
        return cropStockDeducted;
    }

    public void setCropStockDeducted(boolean cropStockDeducted) {
        this.cropStockDeducted = cropStockDeducted;
    }

    public boolean isWalletDebited() {
        return walletDebited;
    }

    public void setWalletDebited(boolean walletDebited) {
        this.walletDebited = walletDebited;
    }

    public boolean isPaymentCompleted() {
        return paymentCompleted;
    }

    public void setPaymentCompleted(boolean paymentCompleted) {
        this.paymentCompleted = paymentCompleted;
    }

    public boolean isCropStockRestored() {
        return cropStockRestored;
    }

    public void setCropStockRestored(boolean cropStockRestored) {
        this.cropStockRestored = cropStockRestored;
    }

    public boolean isWalletRefunded() {
        return walletRefunded;
    }

    public void setWalletRefunded(boolean walletRefunded) {
        this.walletRefunded = walletRefunded;
    }

    public boolean isPaymentRefunded() {
        return paymentRefunded;
    }

    public void setPaymentRefunded(boolean paymentRefunded) {
        this.paymentRefunded = paymentRefunded;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        if (failureReason != null && failureReason.length() > 4000) {
            failureReason = failureReason.substring(0, 4000);
        }
        this.failureReason = failureReason;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
