package com.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CropResponse(
        Long id,
        Long farmerId,
        String farmerName,
        String cropName,
        String commodity,
        String state,
        String district,
        String location,
        String grade,
        BigDecimal quantity,
        BigDecimal originalQuantity,
        String unit,
        BigDecimal pricePerKg,
        BigDecimal originalPricePerKg,
        String description,
        String imageUrl,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
