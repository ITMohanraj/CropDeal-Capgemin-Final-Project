package com.client;

import com.config.FeignConfig;
import com.dto.PaymentRequest;
import com.dto.PaymentResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

@FeignClient(
        name = "payment-service",
        configuration = FeignConfig.class
)
public interface PaymentServiceClient {

    @PostMapping("/api/payments")
    PaymentResponse makePayment(@RequestBody PaymentRequest request);

    @GetMapping("/api/payments/order/{orderId}")
    PaymentResponse getPaymentByOrderId(@PathVariable("orderId") Long orderId);

    @PostMapping("/api/payments/{paymentId}/refund")
    com.dto.RefundResponse refundPayment(@PathVariable("paymentId") Long paymentId, @RequestBody com.dto.RefundRequest request);
}