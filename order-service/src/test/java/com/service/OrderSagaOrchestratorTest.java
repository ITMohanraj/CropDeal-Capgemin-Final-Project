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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderSagaOrchestratorTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderSagaRepository sagaRepository;

    @Mock
    private CropServiceClient cropServiceClient;

    @Mock
    private WalletServiceClient walletServiceClient;

    @Mock
    private PaymentServiceClient paymentServiceClient;

    @Mock
    private OrderEventPublisher eventPublisher;

    private OrderSagaOrchestrator orchestrator;

    private Order order;

    @BeforeEach
    void setUp() {
        orchestrator = new OrderSagaOrchestrator(
                orderRepository,
                sagaRepository,
                cropServiceClient,
                walletServiceClient,
                paymentServiceClient,
                eventPublisher,
                null // null MeterRegistry for tests
        );

        order = new Order();
        order.setId(100L);
        order.setCropId(50L);
        order.setQuantity(20);
        order.setDealerId(200L);
        order.setFarmerId(300L);
        order.setTotalAmount(new BigDecimal("1500.00"));
        order.setPaymentMethod("CARD");
        order.setStatus(OrderStatus.CREATED);

        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(orderRepository.saveAndFlush(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(sagaRepository.save(any(OrderSagaInstance.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(sagaRepository.saveAndFlush(any(OrderSagaInstance.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("SAGA 1: Successful Order Saga with Card Payment")
    void testSuccessfulOrderSaga_CardPayment() {
        when(sagaRepository.findByOrderId(100L)).thenReturn(Optional.empty());

        PaymentResponse paymentResponse = new PaymentResponse();
        paymentResponse.setId(999L);
        paymentResponse.setStatus("SUCCESS");
        paymentResponse.setTransactionReference("TXN-SUCCESS-123");

        when(paymentServiceClient.makePayment(any(PaymentRequest.class))).thenReturn(paymentResponse);

        Order finalized = orchestrator.executeOrderSaga(order);

        assertEquals(OrderStatus.PAID, finalized.getStatus());
        verify(cropServiceClient, times(1)).reduceQuantity(eq(50L), any(QuantityUpdateRequest.class));
        verify(paymentServiceClient, times(1)).makePayment(any(PaymentRequest.class));
        verify(eventPublisher, times(1)).publishOrderPlacedEvent(eq(100L), any(), any(), eq(200L), eq(300L));
        verify(eventPublisher, times(1)).publishOrderCompletedEvent(eq(100L), eq("PAID"));
        verify(cropServiceClient, never()).restoreQuantity(any(), any());
    }

    @Test
    @DisplayName("SAGA 2: Successful Order Saga with Wallet Payment")
    void testSuccessfulOrderSaga_WalletPayment() {
        order.setPaymentMethod("ONLINE_WALLET");
        when(sagaRepository.findByOrderId(100L)).thenReturn(Optional.empty());

        WalletResponse walletResponse = new WalletResponse(1L, 200L, "DEALER",
                new BigDecimal("5000.00"), BigDecimal.ZERO, new BigDecimal("3500.00"));
        when(walletServiceClient.debitWallet(any(DebitWalletRequest.class))).thenReturn(walletResponse);

        Order finalized = orchestrator.executeOrderSaga(order);

        assertEquals(OrderStatus.PAID, finalized.getStatus());
        verify(cropServiceClient, times(1)).reduceQuantity(eq(50L), any(QuantityUpdateRequest.class));
        verify(walletServiceClient, times(1)).debitWallet(any(DebitWalletRequest.class));
        verify(paymentServiceClient, never()).makePayment(any());
        verify(eventPublisher, times(1)).publishOrderCompletedEvent(eq(100L), eq("PAID"));
    }

    @Test
    @DisplayName("SAGA 3: Step 1 Failure (Crop Inventory Exhausted) Cancels Order Without Compensation")
    void testCropReservationFailure_CancelsOrderWithoutCompensation() {
        when(sagaRepository.findByOrderId(100L)).thenReturn(Optional.empty());
        when(cropServiceClient.reduceQuantity(eq(50L), any(QuantityUpdateRequest.class)))
                .thenThrow(new RuntimeException("Insufficient crop stock"));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> orchestrator.executeOrderSaga(order));
        assertTrue(ex.getMessage().contains("Crop stock unavailable"));

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(paymentServiceClient, never()).makePayment(any());
        verify(walletServiceClient, never()).debitWallet(any());
        verify(cropServiceClient, never()).restoreQuantity(any(), any());
        verify(eventPublisher, times(1)).publishOrderCompensatedEvent(eq(100L), any());
    }

    @Test
    @DisplayName("SAGA 4: Step 2 Failure (Payment Declined) Executes Compensation to Restore Crop Stock")
    void testPaymentDeclined_CompensatesCropStock() {
        when(sagaRepository.findByOrderId(100L)).thenReturn(Optional.empty());

        PaymentResponse declinedResponse = new PaymentResponse();
        declinedResponse.setId(999L);
        declinedResponse.setStatus("DECLINED");
        declinedResponse.setTransactionReference("Insufficient card limit");
        when(paymentServiceClient.makePayment(any(PaymentRequest.class))).thenReturn(declinedResponse);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> orchestrator.executeOrderSaga(order));
        assertTrue(ex.getMessage().contains("Payment step"));

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(cropServiceClient, times(1)).reduceQuantity(eq(50L), any(QuantityUpdateRequest.class));
        // Compensation verification: crop stock must be restored
        verify(cropServiceClient, times(1)).restoreQuantity(eq(50L), any(QuantityUpdateRequest.class));
        verify(eventPublisher, times(1)).publishOrderCompensatedEvent(eq(100L), any());
    }

    @Test
    @DisplayName("SAGA 5: Step 2 Failure (Wallet Insufficient Funds) Executes Compensation to Restore Crop Stock")
    void testWalletFailure_CompensatesCropStock() {
        order.setPaymentMethod("WALLET");
        when(sagaRepository.findByOrderId(100L)).thenReturn(Optional.empty());
        when(walletServiceClient.debitWallet(any(DebitWalletRequest.class)))
                .thenThrow(new RuntimeException("Insufficient wallet balance"));

        assertThrows(IllegalStateException.class, () -> orchestrator.executeOrderSaga(order));

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(cropServiceClient, times(1)).reduceQuantity(eq(50L), any(QuantityUpdateRequest.class));
        // Compensation verification: crop stock must be restored
        verify(cropServiceClient, times(1)).restoreQuantity(eq(50L), any(QuantityUpdateRequest.class));
        verify(walletServiceClient, never()).creditWallet(any()); // Wallet was never successfully debited
    }

    @Test
    @DisplayName("SAGA 6: Idempotent Execution - Completed Saga Returns Without Re-executing")
    void testIdempotentExecution_AlreadyCompletedSaga() {
        OrderSagaInstance existing = new OrderSagaInstance();
        existing.setOrderId(100L);
        existing.setStatus(SagaStatus.COMPLETED);
        when(sagaRepository.findByOrderId(100L)).thenReturn(Optional.of(existing));

        Order result = orchestrator.executeOrderSaga(order);

        assertEquals(order, result);
        verify(cropServiceClient, never()).reduceQuantity(any(), any());
        verify(paymentServiceClient, never()).makePayment(any());
        verify(walletServiceClient, never()).debitWallet(any());
    }

    @Test
    @DisplayName("SAGA 7: Idempotent Compensation - Rollback Steps Never Execute Twice")
    void testIdempotentCompensation_DoesNotExecuteTwice() {
        OrderSagaInstance saga = new OrderSagaInstance();
        saga.setOrderId(100L);
        saga.setCropId(50L);
        saga.setQuantity(20);
        saga.setDealerId(200L);
        saga.setAmount(new BigDecimal("1500.00"));
        saga.setCropStockDeducted(true);
        saga.setCropStockRestored(true); // already restored!
        saga.setWalletDebited(true);
        saga.setWalletRefunded(true);   // already refunded!

        orchestrator.compensateSaga(saga, order, "Testing double rollback safety");

        // Since flags are true, zero external calls should be made
        verify(cropServiceClient, never()).restoreQuantity(any(), any());
        verify(walletServiceClient, never()).creditWallet(any());
    }

    @Test
    @DisplayName("SAGA 8: Interrupted Saga Recovery - Unconfirmed Payment Triggers Rollback")
    void testSagaRecovery_UnconfirmedPayment_RollsBackStock() {
        OrderSagaRecoveryManager recoveryManager = new OrderSagaRecoveryManager(
                sagaRepository, orderRepository, orchestrator, paymentServiceClient
        );

        OrderSagaInstance interruptedSaga = new OrderSagaInstance();
        interruptedSaga.setSagaId("SAGA-ORD-100-TEST");
        interruptedSaga.setOrderId(100L);
        interruptedSaga.setCropId(50L);
        interruptedSaga.setQuantity(20);
        interruptedSaga.setAmount(new BigDecimal("1500.00"));
        interruptedSaga.setCropStockDeducted(true);
        interruptedSaga.setStatus(SagaStatus.PAYMENT_PENDING);

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));
        when(paymentServiceClient.getPaymentByOrderId(100L)).thenReturn(null); // payment did not succeed

        recoveryManager.recoverSingleSaga(interruptedSaga);

        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(cropServiceClient, times(1)).restoreQuantity(eq(50L), any(QuantityUpdateRequest.class));
    }

    @Test
    @DisplayName("SAGA 9: Interrupted Saga Recovery - Confirmed Payment Finalizes Order to PAID")
    void testSagaRecovery_ConfirmedPayment_FinalizesOrder() {
        OrderSagaRecoveryManager recoveryManager = new OrderSagaRecoveryManager(
                sagaRepository, orderRepository, orchestrator, paymentServiceClient
        );

        OrderSagaInstance interruptedSaga = new OrderSagaInstance();
        interruptedSaga.setSagaId("SAGA-ORD-100-TEST");
        interruptedSaga.setOrderId(100L);
        interruptedSaga.setStatus(SagaStatus.PAYMENT_PENDING);

        when(orderRepository.findById(100L)).thenReturn(Optional.of(order));

        PaymentResponse confirmedPayment = new PaymentResponse();
        confirmedPayment.setId(888L);
        confirmedPayment.setStatus("SUCCESS");
        when(paymentServiceClient.getPaymentByOrderId(100L)).thenReturn(confirmedPayment);

        recoveryManager.recoverSingleSaga(interruptedSaga);

        assertEquals(OrderStatus.PAID, order.getStatus());
        assertEquals(SagaStatus.COMPLETED, interruptedSaga.getStatus());
        verify(cropServiceClient, never()).restoreQuantity(any(), any());
    }
}
