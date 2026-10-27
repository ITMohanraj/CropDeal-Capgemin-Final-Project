package com.cropdeal.pricealert.service;

import com.cropdeal.pricealert.client.PriceServiceClient;
import com.cropdeal.pricealert.dto.CreateSubscriptionRequest;
import com.cropdeal.pricealert.dto.DatabasePriceDto;
import com.cropdeal.pricealert.dto.MatchResultResponse;
import com.cropdeal.pricealert.dto.PriceAlertTriggeredEvent;
import com.cropdeal.pricealert.dto.SubscriptionResponse;
import com.cropdeal.pricealert.entity.PriceAlertNotification;
import com.cropdeal.pricealert.entity.PriceAlertSubscription;
import com.cropdeal.pricealert.enums.AlertSourceType;
import com.cropdeal.pricealert.repository.PriceAlertNotificationRepository;
import com.cropdeal.pricealert.repository.PriceAlertSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
@Slf4j
public class PriceSubscriptionService {

    private final PriceAlertSubscriptionRepository subscriptionRepository;
    private final PriceAlertNotificationRepository notificationRepository;
    private final PriceServiceClient priceServiceClient;
    private final PriceAlertMatchingEngine matchingEngine;
    private final PriceAlertPublisher alertPublisher;

    @Transactional
    public SubscriptionResponse createSubscription(CreateSubscriptionRequest request) {
        log.info("Creating price subscription for userId={}, role={}, crop={}, targetPrice={}, condition={}",
                request.getUserId(), request.getUserRole(), request.getCropName(), request.getTargetPrice(), request.getPriceCondition());

        PriceAlertSubscription subscription = PriceAlertSubscription.builder()
                .userId(request.getUserId())
                .userRole(request.getUserRole())
                .cropName(request.getCropName().trim().toLowerCase())
                .targetPrice(request.getTargetPrice())
                .priceCondition(request.getPriceCondition())
                .district(cleanDistrict(request.getDistrict()))
                .state(cleanDistrict(request.getState()))
                .unit(request.getUnit() != null ? request.getUnit().trim() : "kg")
                .active(true)
                .build();

        PriceAlertSubscription saved = subscriptionRepository.save(subscription);
        SubscriptionResponse response = SubscriptionResponse.fromEntity(saved);

        // Immediately check current database prices upon creating alert ("while i am putting first time")
        try {
            List<DatabasePriceDto> dbPrices = priceServiceClient.getLatestStoredPricesFromDb();
            if (dbPrices != null && !dbPrices.isEmpty()) {
                String subCrop = saved.getCropName();
                for (DatabasePriceDto priceDto : dbPrices) {
                    if (isCropMatch(subCrop, priceDto.getCommodity())) {
                        if (isDistrictMatch(saved.getDistrict(), priceDto.getDistrict())) {
                            BigDecimal currentPrice = extractEffectivePrice(priceDto);
                            if (currentPrice != null && matchingEngine.evaluatePriceCondition(saved.getPriceCondition(), saved.getTargetPrice(), currentPrice)) {
                                log.info("Immediate price match on creation for subscription #{}: crop={}, target={}, currentPrice={}",
                                        saved.getId(), subCrop, saved.getTargetPrice(), currentPrice);

                                String cropDisplay = capitalize(request.getCropName());
                                String loc = (priceDto.getDistrict() != null && !priceDto.getDistrict().isBlank())
                                        ? " in " + priceDto.getDistrict() : "";
                                String unit = saved.getUnit() != null ? saved.getUnit() : "kg";
                                String title = String.format("Price Alert: %s Target Reached at ₹%.2f/%s",
                                        cropDisplay, currentPrice, unit);
                                String message = String.format("%s modal price in APMC DB is ₹%.2f/%s%s, meeting your target trigger rate of ₹%.2f/%s.",
                                        cropDisplay, currentPrice, unit, loc, saved.getTargetPrice(), unit);

                                PriceAlertNotification notif = PriceAlertNotification.builder()
                                        .subscriptionId(saved.getId())
                                        .userId(saved.getUserId())
                                        .sourceType(AlertSourceType.MARKET_PRICE)
                                        .sourceId(1000L + saved.getId())
                                        .cropName(request.getCropName())
                                        .targetPrice(saved.getTargetPrice())
                                        .matchedPrice(currentPrice)
                                        .message(message)
                                        .notificationSent(true)
                                        .triggeredAt(LocalDateTime.now())
                                        .build();
                                notificationRepository.save(notif);

                                saved.setLastNotifiedAt(LocalDateTime.now());
                                subscriptionRepository.save(saved);

                                PriceAlertTriggeredEvent event = PriceAlertTriggeredEvent.builder()
                                        .subscriptionId(saved.getId())
                                        .userId(saved.getUserId())
                                        .userRole(saved.getUserRole())
                                        .cropName(cropDisplay)
                                        .targetPrice(saved.getTargetPrice())
                                        .matchedPrice(currentPrice)
                                        .priceCondition(saved.getPriceCondition())
                                        .sourceType(AlertSourceType.MARKET_PRICE)
                                        .sourceId(1000L + saved.getId())
                                        .district(priceDto.getDistrict())
                                        .state(priceDto.getState())
                                        .unit(unit)
                                        .title(title)
                                        .message(message)
                                        .timestamp(LocalDateTime.now())
                                        .build();

                                alertPublisher.publishAlert(event);

                                response.setTriggered(true);
                                response.setStatus("TRIGGERED");
                                response.setMatchedPrice(currentPrice);
                                response.setTriggerMessage(message);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Could not perform immediate price match check on subscription creation: {}", ex.getMessage());
        }

        return response;
    }

    /**
     * Evaluates active subscriptions against stored database prices when user clicks "Refresh DB Rates".
     * Triggers matching alerts and publishes events to RabbitMQ topic exchange.
     */
    @Transactional
    public MatchResultResponse evaluateSubscriptionsAgainstDatabasePrices(Long userId) {
        log.info("Evaluating active subscriptions against database prices (userId: {})...", userId);
        List<PriceAlertSubscription> activeSubs = (userId != null)
                ? subscriptionRepository.findByUserIdAndActiveTrue(userId)
                : subscriptionRepository.findAll().stream().filter(s -> Boolean.TRUE.equals(s.getActive())).toList();

        if (activeSubs.isEmpty()) {
            return MatchResultResponse.builder()
                    .matchedCount(0)
                    .notificationsTriggered(0)
                    .message("No active price subscriptions to evaluate.")
                    .build();
        }

        List<DatabasePriceDto> dbPrices = priceServiceClient.getLatestStoredPricesFromDb();
        if (dbPrices == null || dbPrices.isEmpty()) {
            return MatchResultResponse.builder()
                    .matchedCount(0)
                    .notificationsTriggered(0)
                    .message("No stored crop prices available in database.")
                    .build();
        }

        int totalEvaluated = 0;
        int totalTriggered = 0;

        for (PriceAlertSubscription sub : activeSubs) {
            totalEvaluated++;
            String subCrop = sub.getCropName();
            for (DatabasePriceDto priceDto : dbPrices) {
                if (isCropMatch(subCrop, priceDto.getCommodity())) {
                    if (isDistrictMatch(sub.getDistrict(), priceDto.getDistrict())) {
                        BigDecimal currentPrice = extractEffectivePrice(priceDto);
                        if (currentPrice != null && matchingEngine.evaluatePriceCondition(sub.getPriceCondition(), sub.getTargetPrice(), currentPrice)) {
                            // Check if notified very recently (within 2 minutes)
                            boolean recentNotif = sub.getLastNotifiedAt() != null &&
                                    sub.getLastNotifiedAt().isAfter(LocalDateTime.now().minusMinutes(2));
                            if (!recentNotif) {
                                String cropDisplay = capitalize(subCrop);
                                String loc = (priceDto.getDistrict() != null && !priceDto.getDistrict().isBlank())
                                        ? " in " + priceDto.getDistrict() : "";
                                String unit = sub.getUnit() != null ? sub.getUnit() : "kg";
                                String title = String.format("Price Alert: %s Target Reached at ₹%.2f/%s",
                                        cropDisplay, currentPrice, unit);
                                String message = String.format("%s modal price in APMC DB is ₹%.2f/%s%s, meeting your target trigger rate of ₹%.2f/%s.",
                                        cropDisplay, currentPrice, unit, loc, sub.getTargetPrice(), unit);

                                PriceAlertNotification notif = PriceAlertNotification.builder()
                                        .subscriptionId(sub.getId())
                                        .userId(sub.getUserId())
                                        .sourceType(AlertSourceType.MARKET_PRICE)
                                        .sourceId(2000L + sub.getId())
                                        .cropName(subCrop)
                                        .targetPrice(sub.getTargetPrice())
                                        .matchedPrice(currentPrice)
                                        .message(message)
                                        .notificationSent(true)
                                        .triggeredAt(LocalDateTime.now())
                                        .build();
                                notificationRepository.save(notif);

                                sub.setLastNotifiedAt(LocalDateTime.now());
                                subscriptionRepository.save(sub);

                                PriceAlertTriggeredEvent event = PriceAlertTriggeredEvent.builder()
                                        .subscriptionId(sub.getId())
                                        .userId(sub.getUserId())
                                        .userRole(sub.getUserRole())
                                        .cropName(cropDisplay)
                                        .targetPrice(sub.getTargetPrice())
                                        .matchedPrice(currentPrice)
                                        .priceCondition(sub.getPriceCondition())
                                        .sourceType(AlertSourceType.MARKET_PRICE)
                                        .sourceId(2000L + sub.getId())
                                        .district(priceDto.getDistrict())
                                        .state(priceDto.getState())
                                        .unit(unit)
                                        .title(title)
                                        .message(message)
                                        .timestamp(LocalDateTime.now())
                                        .build();

                                alertPublisher.publishAlert(event);
                                totalTriggered++;
                                break;
                            }
                        }
                    }
                }
            }
        }

        String msg = String.format("Evaluated %d active subscriptions against APMC database rates. New alerts triggered: %d",
                totalEvaluated, totalTriggered);
        log.info(msg);

        return MatchResultResponse.builder()
                .matchedCount(totalEvaluated)
                .notificationsTriggered(totalTriggered)
                .message(msg)
                .build();
    }

    private String cleanDistrict(String district) {
        if (district == null || district.isBlank() || district.equalsIgnoreCase("all") || district.equalsIgnoreCase("mandi")) {
            return null;
        }
        return district.trim();
    }

    private boolean isDistrictMatch(String subDistrict, String priceDistrict) {
        if (subDistrict == null || subDistrict.isBlank() || subDistrict.equalsIgnoreCase("all") || subDistrict.equalsIgnoreCase("mandi")) {
            return true;
        }
        if (priceDistrict == null || priceDistrict.isBlank()) {
            return true;
        }
        return subDistrict.equalsIgnoreCase(priceDistrict);
    }

    private boolean isCropMatch(String subCrop, String dbCommodity) {
        if (subCrop == null || dbCommodity == null) return false;
        String a = subCrop.toLowerCase().replaceAll("[^a-z0-9]", "");
        String b = dbCommodity.toLowerCase().replaceAll("[^a-z0-9]", "");
        if (a.equals(b)) return true;
        if (a.contains(b) || b.contains(a)) return true;
        if (a.startsWith("paddy") && (b.startsWith("paddy") || b.contains("rice"))) return true;
        if (a.contains("rice") && (b.startsWith("paddy") || b.contains("rice"))) return true;
        return false;
    }

    private BigDecimal extractEffectivePrice(DatabasePriceDto priceDto) {
        Double val = priceDto.getModalPricePerKg();
        if (val == null || val <= 0) {
            val = priceDto.getMinPricePerKg() != null && priceDto.getMinPricePerKg() > 0
                    ? priceDto.getMinPricePerKg()
                    : priceDto.getMaxPricePerKg();
        }
        if (val != null && val > 0) {
            return BigDecimal.valueOf(val).setScale(2, RoundingMode.HALF_UP);
        }
        return null;
    }

    private String capitalize(String str) {
        if (str == null || str.isBlank()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1).toLowerCase();
    }

    @Transactional(readOnly = true)
    public List<SubscriptionResponse> getSubscriptionsByUser(Long userId) {
        return subscriptionRepository.findByUserId(userId).stream()
                .map(SubscriptionResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getSubscriptionById(Long id) {
        return subscriptionRepository.findById(id)
                .map(SubscriptionResponse::fromEntity)
                .orElseThrow(() -> new NoSuchElementException("Price alert subscription not found with id: " + id));
    }

    @Transactional
    public SubscriptionResponse toggleSubscriptionStatus(Long id, boolean active) {
        PriceAlertSubscription subscription = subscriptionRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Price alert subscription not found with id: " + id));
        subscription.setActive(active);
        PriceAlertSubscription saved = subscriptionRepository.save(subscription);
        return SubscriptionResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteSubscription(Long id) {
        if (!subscriptionRepository.existsById(id)) {
            throw new NoSuchElementException("Price alert subscription not found with id: " + id);
        }
        subscriptionRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<PriceAlertNotification> getAlertHistoryForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByTriggeredAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<PriceAlertNotification> getAlertHistoryForSubscription(Long subscriptionId) {
        return notificationRepository.findBySubscriptionIdOrderByTriggeredAtDesc(subscriptionId);
    }
}
