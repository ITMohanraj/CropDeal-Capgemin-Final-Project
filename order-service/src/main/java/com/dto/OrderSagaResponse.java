package com.dto;

import com.entity.SagaStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record OrderSagaResponse(
        String sagaId,
        Long orderId,
        String currentStep,
        SagaStatus status,
        Long cropId,
        Integer quantity,
        Long dealerId,
        Long farmerId,
        BigDecimal amount,
        String paymentMethod,
        Long paymentId,
        boolean cropStockDeducted,
        boolean walletDebited,
        boolean paymentCompleted,
        boolean cropStockRestored,
        boolean walletRefunded,
        boolean paymentRefunded,
        String failureReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
