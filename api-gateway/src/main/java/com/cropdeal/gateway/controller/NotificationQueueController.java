package com.cropdeal.gateway.controller;

import com.cropdeal.gateway.config.RabbitMQGatewayConfig;
import com.cropdeal.gateway.dto.NotificationQueueRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationQueueController {

    private static final Logger log = LoggerFactory.getLogger(NotificationQueueController.class);
    private final RabbitTemplate rabbitTemplate;

    public NotificationQueueController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping
    public Mono<ResponseEntity<Map<String, Object>>> queueNotification(@RequestBody NotificationQueueRequest request) {
        return Mono.fromCallable(() -> {
            String recipient = request.getRecipient();
            log.info("Gateway received notification dispatch for recipient [{}], title [{}], type [{}] -> publishing directly to RabbitMQ",
                    recipient, request.getTitle(), request.getType());

            Map<String, Object> msg = new HashMap<>();
            msg.put("recipient", recipient);
            msg.put("title", request.getTitle());
            msg.put("type", request.getType() != null ? request.getType() : "SYSTEM");
            msg.put("message", request.getMessage());
            msg.put("orderId", request.getOrderId());

            rabbitTemplate.convertAndSend(
                    RabbitMQGatewayConfig.EXCHANGE,
                    RabbitMQGatewayConfig.ROUTING_KEY,
                    msg
            );

            log.info("Successfully queued notification to RabbitMQ exchange {} with routing key {} -> queue {}",
                    RabbitMQGatewayConfig.EXCHANGE, RabbitMQGatewayConfig.ROUTING_KEY, RabbitMQGatewayConfig.QUEUE);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "QUEUED");
            response.put("recipient", recipient);
            response.put("type", request.getType());
            response.put("title", request.getTitle());
            response.put("message", request.getMessage());
            response.put("timestamp", LocalDateTime.now().toString());

            return ResponseEntity.accepted().body(response);
        }).onErrorResume(ex -> {
            log.error("Failed to enqueue notification to RabbitMQ: {}", ex.getMessage(), ex);
            Map<String, Object> err = new HashMap<>();
            err.put("status", "ERROR");
            err.put("error", ex.getMessage());
            return Mono.just(ResponseEntity.internalServerError().body(err));
        });
    }
}
