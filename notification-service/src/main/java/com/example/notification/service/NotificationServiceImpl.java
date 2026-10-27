package com.example.notification.service;

import com.example.notification.config.RabbitMQConfig;
import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.entity.Notification;
import com.example.notification.exception.NotificationException;
import com.example.notification.repository.NotificationRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    private final NotificationRepository notificationRepository;
    private final TemplateService templateService;
    private final EmailService emailService;
    private final RabbitTemplate rabbitTemplate;

    public NotificationServiceImpl(
            NotificationRepository notificationRepository,
            TemplateService templateService,
            EmailService emailService,
            RabbitTemplate rabbitTemplate) {

        this.notificationRepository = notificationRepository;
        this.templateService = templateService;
        this.emailService = emailService;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Override
    public NotificationResponse sendNotification(NotificationRequest request) {
        try {
            // Explicitly publish to RabbitMQ exchange to flow asynchronously through queue
            if (rabbitTemplate != null) {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.EXCHANGE,
                        RabbitMQConfig.ROUTING_KEY,
                        request
                );
                log.info("Published notification request to RabbitMQ exchange {} with routing key {}: recipient={}",
                        RabbitMQConfig.EXCHANGE, RabbitMQConfig.ROUTING_KEY, request.getRecipient());
            }

            NotificationResponse response = new NotificationResponse();
            response.setRecipient(request.getRecipient());
            response.setUserId(request.getRecipient());
            response.setTitle(request.getTitle() != null ? request.getTitle() : request.getType());
            response.setType(request.getType());
            response.setMessage(request.getMessage());
            response.setOrderId(request.getOrderId());
            response.setIsRead(false);
            response.setStatus("QUEUED");
            response.setCreatedAt(LocalDateTime.now());
            return response;

        } catch (Exception e) {
            log.error("RabbitMQ publish error, falling back to direct persistence: {}", e.getMessage());
            // Fallback direct persistence if RabbitMQ is unavailable
            Notification notification = new Notification();
            notification.setRecipient(request.getRecipient());
            notification.setTitle(request.getTitle() != null ? request.getTitle() : request.getType());
            notification.setType(request.getType() != null ? request.getType() : "SYSTEM");
            notification.setMessage(request.getMessage());
            notification.setOrderId(request.getOrderId());
            notification.setIsRead(false);
            notification.setStatus("SENT");
            Notification saved = notificationRepository.save(notification);
            return mapToResponse(saved);
        }
    }

    @Override
    public NotificationResponse sendOtp(String phoneNumber, String otp) {
        String message = templateService.generateOtpMessage(otp);
        System.out.println("SMS TO " + phoneNumber + ": " + message);

        Notification notification = new Notification();
        notification.setRecipient(phoneNumber);
        notification.setTitle("Delivery OTP");
        notification.setType("DELIVERY_OTP");
        notification.setMessage(message);
        notification.setIsRead(false);
        notification.setStatus("SENT");

        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    @Override
    public NotificationResponse sendDeliveryCompletedNotification(String phoneNumber, Long orderId) {
        String message = templateService.generateDeliveryCompletedMessage(orderId);
        System.out.println("SMS TO " + phoneNumber + ": " + message);

        Notification notification = new Notification();
        notification.setRecipient(phoneNumber);
        notification.setTitle("Delivery Completed");
        notification.setType("DELIVERY_COMPLETED");
        notification.setMessage(message);
        notification.setOrderId(orderId);
        notification.setIsRead(false);
        notification.setStatus("SENT");

        Notification saved = notificationRepository.save(notification);
        return mapToResponse(saved);
    }

    @Override
    public NotificationResponse getNotification(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotificationException("Notification not found with id: " + notificationId));
        return mapToResponse(notification);
    }

    @Override
    public List<NotificationResponse> getNotificationsByRecipient(String recipient) {
        return notificationRepository.findByRecipientOrderByCreatedAtDesc(recipient)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationResponse> getNotificationsByUser(String userId) {
        List<String> recipients = buildRecipientCandidates(userId);
        return notificationRepository.findByRecipientInOrderByCreatedAtDesc(recipients)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<NotificationResponse> getNotificationsByOrder(Long orderId) {
        return notificationRepository.findByOrderId(orderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    @Override
    public void markAllAsRead(String userId) {
        List<String> recipients = buildRecipientCandidates(userId);
        notificationRepository.markAllAsReadForRecipients(recipients);
    }

    @Override
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }

    @Override
    public void clearAllNotifications(String userId) {
        List<String> recipients = buildRecipientCandidates(userId);
        notificationRepository.deleteByRecipientIn(recipients);
    }

    private List<String> buildRecipientCandidates(String userId) {
        if (userId == null || userId.isBlank()) {
            return List.of();
        }
        Set<String> set = new LinkedHashSet<>();
        String trimmed = userId.trim();
        set.add(trimmed);
        set.add("USER_" + trimmed);
        set.add(trimmed.toLowerCase());
        set.add(trimmed.toUpperCase());

        // Map numeric IDs and role aliases
        if ("1".equals(trimmed) || "farmer".equalsIgnoreCase(trimmed)) {
            set.addAll(List.of("1", "USER_1", "farmer", "FARMER"));
        } else if ("2".equals(trimmed) || "dealer".equalsIgnoreCase(trimmed)) {
            set.addAll(List.of("2", "USER_2", "dealer", "DEALER"));
        } else if ("3".equals(trimmed) || "delivery".equalsIgnoreCase(trimmed) || "delivery_partner".equalsIgnoreCase(trimmed)) {
            set.addAll(List.of("3", "USER_3", "delivery", "DELIVERY", "DELIVERY_PARTNER"));
        } else if ("4".equals(trimmed) || "admin".equalsIgnoreCase(trimmed)) {
            set.addAll(List.of("4", "USER_4", "admin", "ADMIN"));
        } else if ("5".equals(trimmed) || "mohanrajk1110".equalsIgnoreCase(trimmed)) {
            set.addAll(List.of("5", "USER_5", "mohanrajk1110"));
        }

        return new ArrayList<>(set);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        NotificationResponse response = new NotificationResponse();
        response.setId(notification.getId());
        response.setRecipient(notification.getRecipient());
        response.setUserId(notification.getRecipient());
        response.setTitle(notification.getTitle() != null && !notification.getTitle().isBlank()
                ? notification.getTitle()
                : (notification.getType() != null ? notification.getType() : "Notification"));
        response.setType(notification.getType());
        response.setMessage(notification.getMessage());
        response.setStatus(notification.getStatus());
        response.setIsRead(Boolean.TRUE.equals(notification.getIsRead()));
        response.setOrderId(notification.getOrderId());
        response.setCreatedAt(notification.getCreatedAt());
        return response;
    }
}
