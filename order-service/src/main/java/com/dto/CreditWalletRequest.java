package com.dto;

import java.math.BigDecimal;

public record CreditWalletRequest(
        Long userId,
        BigDecimal amount,
        String description
) {}
