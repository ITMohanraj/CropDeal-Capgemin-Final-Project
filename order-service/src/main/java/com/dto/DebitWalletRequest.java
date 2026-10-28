package com.dto;

import java.math.BigDecimal;

public record DebitWalletRequest(
        Long userId,
        BigDecimal amount,
        String description
) {}
