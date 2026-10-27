package com.cropdeal.pricealert.dto;

import com.cropdeal.pricealert.entity.PriceAlertSubscription;
import com.cropdeal.pricealert.enums.PriceCondition;
import com.cropdeal.pricealert.enums.UserRole;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionResponse {

    private Long id;
    private Long userId;
    private UserRole userRole;
    private String cropName;
    private BigDecimal targetPrice;
    private PriceCondition priceCondition;
    private String district;
    private String state;
    private String unit;
    private Boolean active;
    private LocalDateTime lastNotifiedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean triggered;
    private BigDecimal matchedPrice;
    private String status;
    private String triggerMessage;

    public static SubscriptionResponse fromEntity(PriceAlertSubscription entity) {
        if (entity == null) return null;
        boolean isTriggered = entity.getLastNotifiedAt() != null;
        return SubscriptionResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .userRole(entity.getUserRole())
                .cropName(entity.getCropName())
                .targetPrice(entity.getTargetPrice())
                .priceCondition(entity.getPriceCondition())
                .district(entity.getDistrict())
                .state(entity.getState())
                .unit(entity.getUnit())
                .active(entity.getActive())
                .lastNotifiedAt(entity.getLastNotifiedAt())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .triggered(isTriggered)
                .status(isTriggered ? "TRIGGERED" : (Boolean.TRUE.equals(entity.getActive()) ? "ACTIVE" : "INACTIVE"))
                .build();
    }
}
