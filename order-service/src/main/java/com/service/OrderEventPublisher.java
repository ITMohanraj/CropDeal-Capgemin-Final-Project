package com.service;

import com.config.RabbitMQConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class OrderEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(OrderEventPublisher.class);

    @Autowired(required = false)
    private RabbitTemplate rabbitTemplate;

    public void publishOrderPlacedEvent(Long orderId, String cropName, Object totalAmount, Long buyerId, Long farmerId) {
        if (buyerId != null) {
            Map<String, Object> buyerMsg = new HashMap<>();
            buyerMsg.put("recipient", String.valueOf(buyerId));
            buyerMsg.put("title", "Order Placed #" + orderId);
            buyerMsg.put("type", "ORDER");
            buyerMsg.put("message", "Your order #" + orderId + " for " + (cropName != null ? cropName : "Crop")
                    + " (₹" + totalAmount + ") was placed successfully.");
            buyerMsg.put("orderId", orderId);
            publish(buyerMsg);
        }

        if (farmerId != null) {
            Map<String, Object> farmerMsg = new HashMap<>();
            farmerMsg.put("recipient", String.valueOf(farmerId));
            farmerMsg.put("title", "New Order Received #" + orderId);
            farmerMsg.put("type", "ORDER");
            farmerMsg.put("message", "You received a new order #" + orderId + " for " + (cropName != null ? cropName : "Crop") + ".");
            farmerMsg.put("orderId", orderId);
            publish(farmerMsg);
        }
    }

    public void publishOrderCompletedEvent(Long orderId, String status) {
        log.info("Order #{} marked as [{}]", orderId, status);
    }

    public void publishOrderCompensatedEvent(Long orderId, String reason) {
        Map<String, Object> compMsg = new HashMap<>();
        compMsg.put("recipient", "ALL");
        compMsg.put("title", "Order Cancelled #" + orderId);
        compMsg.put("type", "ORDER");
        compMsg.put("message", "Order #" + orderId + " was cancelled and refunded. Reason: " + reason);
        compMsg.put("orderId", orderId);
        publish(compMsg);
    }

    private void publish(Map<String, Object> event) {
        if (rabbitTemplate != null) {
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.NOTIFICATION_EXCHANGE,
                        RabbitMQConfig.NOTIFICATION_ROUTING_KEY,
                        event
                );
                log.info("RabbitMQ published notification to [{}:{}] successfully: {}",
                        RabbitMQConfig.NOTIFICATION_EXCHANGE,
                        RabbitMQConfig.NOTIFICATION_ROUTING_KEY,
                        event);
            } catch (Exception e) {
                log.warn("RabbitMQ broker unavailable. Continuing without async notification: {}", e.getMessage());
            }
        } else {
            log.info("RabbitTemplate not initialized. Mock notification: {}", event);
        }
    }
}
