package com.service;

import com.client.PaymentServiceClient;
import com.client.WalletServiceClient;
import com.dto.PaymentResponse;
import com.entity.Order;
import com.entity.OrderSagaInstance;
import com.entity.OrderStatus;
import com.entity.SagaStatus;
import com.repository.OrderRepository;
import com.repository.OrderSagaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Recovers interrupted Sagas after a service restart or container reboot.
 * Scans for in-flight sagas and guarantees eventual consistency by resuming
 * transactions or executing required idempotent compensations.
 */
@Component
public class OrderSagaRecoveryManager {

    private static final Logger log = LoggerFactory.getLogger(OrderSagaRecoveryManager.class);

    private final OrderSagaRepository sagaRepository;
    private final OrderRepository orderRepository;
    private final OrderSagaOrchestrator orchestrator;
    private final PaymentServiceClient paymentServiceClient;

    public OrderSagaRecoveryManager(
            OrderSagaRepository sagaRepository,
            OrderRepository orderRepository,
            OrderSagaOrchestrator orchestrator,
            PaymentServiceClient paymentServiceClient) {
        this.sagaRepository = sagaRepository;
        this.orderRepository = orderRepository;
        this.orchestrator = orchestrator;
        this.paymentServiceClient = paymentServiceClient;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recoverInterruptedSagasOnStartup() {
        log.info("[SAGA RECOVERY] Scanning for pending or interrupted Order Sagas after startup...");

        List<OrderSagaInstance> interrupted = sagaRepository.findByStatusIn(
                List.of(SagaStatus.STARTED, SagaStatus.CROP_RESERVED, SagaStatus.PAYMENT_PENDING, SagaStatus.COMPENSATING)
        );

        if (interrupted.isEmpty()) {
            log.info("[SAGA RECOVERY] No pending or interrupted sagas found. Registry is clean.");
            return;
        }

        log.warn("[SAGA RECOVERY] Found {} interrupted Saga(s) requiring recovery / compensation.", interrupted.size());

        for (OrderSagaInstance saga : interrupted) {
            try {
                recoverSingleSaga(saga);
            } catch (Exception ex) {
                log.error("[SAGA RECOVERY ERROR] Failed recovering Saga #{} (Order #{}): {}",
                        saga.getSagaId(), saga.getOrderId(), ex.getMessage());
            }
        }
    }

    public void recoverSingleSaga(OrderSagaInstance saga) {
        log.info("[SAGA RECOVERY] Processing Saga #{} for Order #{} in status [{}]",
                saga.getSagaId(), saga.getOrderId(), saga.getStatus());

        Optional<Order> orderOpt = orderRepository.findById(saga.getOrderId());
        if (orderOpt.isEmpty()) {
            log.warn("[SAGA RECOVERY] Order #{} not found. Marking Saga as FAILED.", saga.getOrderId());
            saga.setStatus(SagaStatus.FAILED);
            saga.setFailureReason("Order entity not found during recovery");
            sagaRepository.save(saga);
            return;
        }

        Order order = orderOpt.get();

        if (saga.getStatus() == SagaStatus.COMPENSATING) {
            log.info("[SAGA RECOVERY] Resuming in-progress compensation for Order #{}", order.getId());
            orchestrator.compensateSaga(saga, order, saga.getFailureReason() != null ? saga.getFailureReason() : "Recovered compensation");
            return;
        }

        if (saga.getStatus() == SagaStatus.PAYMENT_PENDING || saga.getStatus() == SagaStatus.CROP_RESERVED) {
            // Check if payment was actually completed in payment-service
            boolean paymentConfirmed = false;
            try {
                PaymentResponse p = paymentServiceClient.getPaymentByOrderId(order.getId());
                if (p != null && "SUCCESS".equalsIgnoreCase(p.getStatus())) {
                    paymentConfirmed = true;
                    saga.setPaymentId(p.getId());
                }
            } catch (Exception ignored) {}

            if (paymentConfirmed) {
                log.info("[SAGA RECOVERY] Payment confirmed for Order #{}. Finalizing as COMPLETED.", order.getId());
                saga.setPaymentCompleted(true);
                saga.setStatus(SagaStatus.COMPLETED);
                saga.setCurrentStep("COMPLETED");
                sagaRepository.save(saga);

                order.setStatus(OrderStatus.PAID);
                orderRepository.save(order);
            } else {
                log.warn("[SAGA RECOVERY] Unconfirmed payment for Order #{}. Executing compensating rollback.", order.getId());
                orchestrator.compensateSaga(saga, order, "Interrupted saga recovered after restart - payment unconfirmed");
            }
            return;
        }

        if (saga.getStatus() == SagaStatus.STARTED) {
            log.warn("[SAGA RECOVERY] Saga started but never reserved crop. Cancelling Order #{}.", order.getId());
            saga.setStatus(SagaStatus.FAILED);
            saga.setFailureReason("Aborted before step 1 completion");
            sagaRepository.save(saga);

            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);
        }
    }
}
