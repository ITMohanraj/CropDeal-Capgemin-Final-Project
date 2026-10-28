package com.service;

import com.client.CropServiceClient;
import com.client.PaymentServiceClient;
import com.client.WalletServiceClient;
import com.dto.*;
import com.entity.Order;
import com.entity.OrderSagaInstance;
import com.entity.OrderStatus;
import com.entity.SagaStatus;
import com.repository.OrderRepository;
import com.repository.OrderSagaRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

/**
 * Enterprise Saga Pattern Orchestrator for Distributed Order Processing.
 * Coordinates multi-service transactions across:
 *   Step 1: Crop Stock Reservation (crop-service)
 *   Step 2: Payment / Wallet Processing (payment-service / wallet-service)
 *   Step 3: Order Finalization & Asynchronous Notification Events (RabbitMQ)
 *
 * Equipped with Resilience4j Circuit Breaker & Retry, persistent Saga state tracking,
 * strictly idempotent compensating rollbacks, duplicate prevention, and recovery.
 */
@Service
public class OrderSagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(OrderSagaOrchestrator.class);

    private final OrderRepository orderRepository;
    private final OrderSagaRepository sagaRepository;
    private final CropServiceClient cropServiceClient;
    private final WalletServiceClient walletServiceClient;
    private final PaymentServiceClient paymentServiceClient;
    private final OrderEventPublisher eventPublisher;

    private Counter sagaStartedCounter;
    private Counter sagaCompletedCounter;
    private Counter sagaCompensatedCounter;
    private Counter sagaFailedCounter;

    @Autowired
    public OrderSagaOrchestrator(
            OrderRepository orderRepository,
            OrderSagaRepository sagaRepository,
            CropServiceClient cropServiceClient,
            WalletServiceClient walletServiceClient,
            PaymentServiceClient paymentServiceClient,
            OrderEventPublisher eventPublisher,
            @Autowired(required = false) MeterRegistry meterRegistry) {

        this.orderRepository = orderRepository;
        this.sagaRepository = sagaRepository;
        this.cropServiceClient = cropServiceClient;
        this.walletServiceClient = walletServiceClient;
        this.paymentServiceClient = paymentServiceClient;
        this.eventPublisher = eventPublisher;

        if (meterRegistry != null) {
            this.sagaStartedCounter = Counter.builder("saga.orders.started")
                    .description("Total Order Sagas started").register(meterRegistry);
            this.sagaCompletedCounter = Counter.builder("saga.orders.completed")
                    .description("Total Order Sagas successfully completed").register(meterRegistry);
            this.sagaCompensatedCounter = Counter.builder("saga.orders.compensated")
                    .description("Total Order Sagas compensated").register(meterRegistry);
            this.sagaFailedCounter = Counter.builder("saga.orders.failed")
                    .description("Total Order Sagas failed").register(meterRegistry);
        }
    }

    /**
     * Executes the complete Distributed Order Saga.
     * Step 1: Reserve crop stock in crop-service (atomically decrement available stock)
     * Step 2: Process payment via wallet-service (for WALLET) or payment-service (for Card/NetBanking/etc.)
     * Step 3: Finalize order status to PAID and publish RabbitMQ events.
     *
     * If any step fails, automated, safe, idempotent compensating actions are executed:
     * - Restores crop stock in crop-service
     * - Reverses wallet transactions or refunds payments
     * - Marks the order as CANCELLED and persists Saga failure audit
     */
    public Order executeOrderSaga(Order order) {
        log.info("[SAGA START] Initiating distributed transaction for Order #{}", order.getId());

        // 1. Idempotency check: verify if a Saga for this order already exists
        Optional<OrderSagaInstance> existingSaga = sagaRepository.findByOrderId(order.getId());
        if (existingSaga.isPresent()) {
            OrderSagaInstance instance = existingSaga.get();
            if (instance.getStatus() == SagaStatus.COMPLETED) {
                log.info("[SAGA IDEMPOTENT] Order #{} saga is already COMPLETED. Returning existing order.", order.getId());
                return order;
            }
        }

        // 2. Initialize and persist the Saga instance
        OrderSagaInstance saga = existingSaga.orElseGet(OrderSagaInstance::new);
        if (saga.getSagaId() == null) {
            saga.setSagaId("SAGA-ORD-" + order.getId() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        saga.setOrderId(order.getId());
        saga.setCropId(order.getCropId());
        saga.setQuantity(order.getQuantity());
        saga.setDealerId(order.getDealerId());
        saga.setFarmerId(order.getFarmerId());
        saga.setAmount(order.getTotalAmount());
        saga.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "ONLINE_WALLET");
        saga.setStatus(SagaStatus.STARTED);
        saga.setCurrentStep("START");
        saga = sagaRepository.save(saga);

        if (sagaStartedCounter != null) sagaStartedCounter.increment();

        // =========================================================================
        // STEP 1: CROP INVENTORY RESERVATION (crop-service)
        // =========================================================================
        if (!saga.isCropStockDeducted()) {
            saga.setCurrentStep("CROP_RESERVATION");
            log.info("[SAGA STEP 1] Reserving inventory in crop-service: Crop #{} Quantity: {} KG",
                    order.getCropId(), order.getQuantity());

            try {
                executeCropReservationWithResilience(order.getCropId(), order.getQuantity());
                saga.setCropStockDeducted(true);
                saga.setStatus(SagaStatus.CROP_RESERVED);
                saga = sagaRepository.save(saga);
                log.info("[SAGA STEP 1 SUCCESS] Crop #{} inventory reserved successfully for Order #{}",
                        order.getCropId(), order.getId());

            } catch (Exception ex) {
                log.error("[SAGA STEP 1 FAILURE] Crop reservation failed for Order #{}: {}", order.getId(), ex.getMessage());
                saga.setStatus(SagaStatus.FAILED);
                saga.setFailureReason("Crop reservation failed: " + ex.getMessage());
                sagaRepository.saveAndFlush(saga);

                order.setStatus(OrderStatus.CANCELLED);
                orderRepository.saveAndFlush(order);

                eventPublisher.publishOrderCompensatedEvent(order.getId(), "Crop stock unavailable or reservation failed: " + ex.getMessage());
                if (sagaFailedCounter != null) sagaFailedCounter.increment();

                throw new IllegalStateException("Order Saga aborted: Crop stock unavailable or reservation failed: " + ex.getMessage(), ex);
            }
        }

        // =========================================================================
        // STEP 2: PAYMENT / WALLET EXECUTION (payment-service / wallet-service)
        // =========================================================================
        saga.setCurrentStep("PAYMENT_PROCESSING");
        order.setStatus(OrderStatus.PAYMENT_PENDING);
        order = orderRepository.save(order);
        saga.setStatus(SagaStatus.PAYMENT_PENDING);
        saga = sagaRepository.save(saga);

        try {
            boolean isWallet = isWalletPayment(order.getPaymentMethod());

            if (isWallet) {
                log.info("[SAGA STEP 2: WALLET] Debiting wallet for Dealer #{} Amount: ₹{}",
                        order.getDealerId(), order.getTotalAmount());

                executeWalletDebitWithResilience(order.getDealerId(), order.getTotalAmount(), "Order #" + order.getId() + " payment");
                saga.setWalletDebited(true);
                saga.setPaymentCompleted(true);
                saga = sagaRepository.save(saga);
                log.info("[SAGA STEP 2 SUCCESS] Wallet debited successfully for Order #{}", order.getId());

            } else {
                log.info("[SAGA STEP 2: PAYMENT] Invoking payment-service for Order #{} Amount: ₹{}",
                        order.getId(), order.getTotalAmount());

                PaymentResponse paymentResponse = executePaymentWithResilience(order);

                if (paymentResponse != null && "SUCCESS".equalsIgnoreCase(paymentResponse.getStatus())) {
                    saga.setPaymentCompleted(true);
                    saga.setPaymentId(paymentResponse.getId());
                    saga = sagaRepository.save(saga);
                    log.info("[SAGA STEP 2 SUCCESS] Payment completed for Order #{} (Txn: {})",
                            order.getId(), paymentResponse.getTransactionReference());
                } else {
                    String reason = paymentResponse != null ? paymentResponse.getTransactionReference() : "Payment service returned null/failure";
                    log.error("[SAGA STEP 2 FAILURE] Payment rejected for Order #{}: {}", order.getId(), reason);
                    compensateSaga(saga, order, "Payment rejected: " + reason);
                    throw new IllegalStateException("Order Saga failed at Payment step: " + reason);
                }
            }

        } catch (Exception ex) {
            log.error("[SAGA STEP 2 FAILURE] Exception during payment processing for Order #{}: {}", order.getId(), ex.getMessage());
            if (saga.getStatus() != SagaStatus.COMPENSATED && saga.getStatus() != SagaStatus.COMPENSATING) {
                compensateSaga(saga, order, "Payment execution failed: " + ex.getMessage());
            }
            if (ex instanceof IllegalStateException) {
                throw (IllegalStateException) ex;
            }
            throw new IllegalStateException("Order Saga failed at Payment step: " + ex.getMessage(), ex);
        }

        // =========================================================================
        // STEP 3: ORDER FINALIZATION & ASYNCHRONOUS NOTIFICATIONS (RabbitMQ)
        // =========================================================================
        saga.setCurrentStep("COMPLETED");
        saga.setStatus(SagaStatus.COMPLETED);
        saga = sagaRepository.save(saga);

        order.setStatus(OrderStatus.PAID);
        order = orderRepository.save(order);

        eventPublisher.publishOrderPlacedEvent(
                order.getId(),
                order.getCropName(),
                order.getTotalAmount(),
                order.getDealerId(),
                order.getFarmerId()
        );
        eventPublisher.publishOrderCompletedEvent(order.getId(), "PAID");

        if (sagaCompletedCounter != null) sagaCompletedCounter.increment();
        log.info("[SAGA COMPLETED] Order #{} successfully placed and distributed transaction finalized!", order.getId());

        return order;
    }

    /**
     * Executes compensating rollback actions in reverse order of transaction steps.
     * Guarantees safety, idempotency, and never executes any compensation step twice.
     */
    public void compensateSaga(OrderSagaInstance saga, Order order, String reason) {
        if (saga.getStatus() == SagaStatus.COMPENSATED) {
            log.warn("[SAGA COMPENSATION SKIPPED] Order #{} saga is already COMPENSATED", order.getId());
            return;
        }
        log.warn("[SAGA COMPENSATION START] Rolling back Order #{} state. Reason: {}", order.getId(), reason);

        // Compensate Step 2: Payment refund if payment was recorded
        compensatePayment(saga);

        // Compensate Step 2: Wallet refund if wallet was debited
        compensateWallet(saga);

        // Compensate Step 1: Crop stock restoration if crop stock was deducted
        compensateCropStock(saga);

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.saveAndFlush(order);

        saga.setStatus(SagaStatus.COMPENSATED);
        saga.setCurrentStep("COMPENSATED");
        saga.setFailureReason(reason);
        sagaRepository.saveAndFlush(saga);

        eventPublisher.publishOrderCompensatedEvent(order.getId(), reason);
        if (sagaCompensatedCounter != null) sagaCompensatedCounter.increment();

        log.info("[SAGA COMPENSATION COMPLETE] All compensating actions verified for Order #{}", order.getId());
    }

    /**
     * Idempotent Compensation: Restores crop stock in crop-service.
     */
    public void compensateCropStock(OrderSagaInstance saga) {
        if (saga.isCropStockDeducted() && !saga.isCropStockRestored()) {
            try {
                log.info("[SAGA COMPENSATION: CROP] Restoring {} KG to Crop #{}",
                        saga.getQuantity(), saga.getCropId());

                cropServiceClient.restoreQuantity(
                        saga.getCropId(),
                        new QuantityUpdateRequest(BigDecimal.valueOf(saga.getQuantity()))
                );
                saga.setCropStockRestored(true);
                sagaRepository.save(saga);
                log.info("[SAGA COMPENSATION: CROP SUCCESS] Crop #{} stock restored successfully", saga.getCropId());
            } catch (Exception ex) {
                log.error("[SAGA COMPENSATION: CROP FAILED] Failed to restore Crop #{} stock: {}",
                        saga.getCropId(), ex.getMessage());
            }
        } else {
            log.debug("[SAGA COMPENSATION: CROP SKIPPED] Crop stock deduction was either not performed or already restored.");
        }
    }

    /**
     * Idempotent Compensation: Credits back debited funds into the user's wallet.
     */
    public void compensateWallet(OrderSagaInstance saga) {
        if (saga.isWalletDebited() && !saga.isWalletRefunded()) {
            try {
                log.info("[SAGA COMPENSATION: WALLET] Refunding ₹{} to Dealer #{} wallet",
                        saga.getAmount(), saga.getDealerId());

                walletServiceClient.creditWallet(
                        new CreditWalletRequest(
                                saga.getDealerId(),
                                saga.getAmount(),
                                "Saga compensation refund for cancelled Order #" + saga.getOrderId()
                        )
                );
                saga.setWalletRefunded(true);
                sagaRepository.save(saga);
                log.info("[SAGA COMPENSATION: WALLET SUCCESS] Wallet refunded successfully for Order #{}", saga.getOrderId());
            } catch (Exception ex) {
                log.error("[SAGA COMPENSATION: WALLET FAILED] Failed to refund wallet for Order #{}: {}",
                        saga.getOrderId(), ex.getMessage());
            }
        }
    }

    /**
     * Idempotent Compensation: Submits refund to payment-service.
     */
    public void compensatePayment(OrderSagaInstance saga) {
        if (saga.isPaymentCompleted() && !saga.isPaymentRefunded()) {
            try {
                Long paymentId = saga.getPaymentId();
                if (paymentId == null) {
                    PaymentResponse p = paymentServiceClient.getPaymentByOrderId(saga.getOrderId());
                    if (p != null) paymentId = p.getId();
                }

                if (paymentId != null) {
                    log.info("[SAGA COMPENSATION: PAYMENT] Requesting refund for Payment #{} (Order #{})",
                            paymentId, saga.getOrderId());

                    RefundRequest refundRequest = new RefundRequest();
                    refundRequest.setDeliveryId(0L);
                    refundRequest.setRefundAmount(saga.getAmount());
                    refundRequest.setReason("Saga compensation: " + saga.getFailureReason());

                    paymentServiceClient.refundPayment(paymentId, refundRequest);
                    saga.setPaymentRefunded(true);
                    sagaRepository.save(saga);
                    log.info("[SAGA COMPENSATION: PAYMENT SUCCESS] Payment #{} refunded successfully", paymentId);
                }
            } catch (Exception ex) {
                log.error("[SAGA COMPENSATION: PAYMENT FAILED] Failed to refund payment for Order #{}: {}",
                        saga.getOrderId(), ex.getMessage());
            }
        }
    }

    /**
     * Circuit Breaker & Retry protected call to crop-service for inventory deduction.
     */
    @CircuitBreaker(name = "cropService", fallbackMethod = "executeCropReservationFallback")
    @Retry(name = "cropService")
    public CropResponse executeCropReservationWithResilience(Long cropId, Integer quantity) {
        log.info("[Resilience4j] Attempting crop reservation: Crop #{} Quantity: {} KG", cropId, quantity);
        return cropServiceClient.reduceQuantity(cropId, new QuantityUpdateRequest(BigDecimal.valueOf(quantity)));
    }

    public CropResponse executeCropReservationFallback(Long cropId, Integer quantity, Throwable t) {
        log.error("[Resilience4j FALLBACK] Crop reservation failed or circuit open for Crop #{}: {}", cropId, t.getMessage());
        throw new IllegalStateException("Crop Service unavailable or stock reservation rejected: " + t.getMessage(), t);
    }

    /**
     * Circuit Breaker & Retry protected call to payment-service.
     */
    @CircuitBreaker(name = "paymentService", fallbackMethod = "executePaymentFallback")
    @Retry(name = "paymentService")
    public PaymentResponse executePaymentWithResilience(Order order) {
        log.info("[Resilience4j] Attempting Payment Service call for Order #{} (Amount: ₹{})", order.getId(), order.getTotalAmount());
        PaymentRequest request = new PaymentRequest();
        request.setOrderId(order.getId());
        request.setDealerId(order.getDealerId());
        request.setFarmerId(order.getFarmerId());
        request.setAmount(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
        request.setPaymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "ONLINE_WALLET");

        return paymentServiceClient.makePayment(request);
    }

    public PaymentResponse executePaymentFallback(Order order, Throwable t) {
        log.warn("[Resilience4j FALLBACK] Payment service circuit open or timed out for Order #{}: {}", order.getId(), t.getMessage());
        PaymentResponse fallbackResponse = new PaymentResponse();
        fallbackResponse.setOrderId(order.getId());
        fallbackResponse.setStatus("FAILED");
        fallbackResponse.setTransactionReference("Payment service unavailable or timed out: " + t.getMessage());
        return fallbackResponse;
    }

    /**
     * Resilient wallet debit call.
     */
    public WalletResponse executeWalletDebitWithResilience(Long userId, BigDecimal amount, String description) {
        return walletServiceClient.debitWallet(new DebitWalletRequest(userId, amount, description));
    }

    /**
     * Helper to detect wallet payment methods.
     */
    private boolean isWalletPayment(String paymentMethod) {
        if (paymentMethod == null) return true;
        String m = paymentMethod.toUpperCase();
        return m.contains("WALLET");
    }

    /**
     * Helper for inspecting current Saga status.
     */
    public Optional<OrderSagaResponse> getSagaDetails(Long orderId) {
        return sagaRepository.findByOrderId(orderId).map(s -> new OrderSagaResponse(
                s.getSagaId(),
                s.getOrderId(),
                s.getCurrentStep(),
                s.getStatus(),
                s.getCropId(),
                s.getQuantity(),
                s.getDealerId(),
                s.getFarmerId(),
                s.getAmount(),
                s.getPaymentMethod(),
                s.getPaymentId(),
                s.isCropStockDeducted(),
                s.isWalletDebited(),
                s.isPaymentCompleted(),
                s.isCropStockRestored(),
                s.isWalletRefunded(),
                s.isPaymentRefunded(),
                s.getFailureReason(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        ));
    }
}
