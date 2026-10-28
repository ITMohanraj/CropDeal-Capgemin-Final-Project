package com.client;

import com.config.FeignConfig;
import com.dto.CreditWalletRequest;
import com.dto.DebitWalletRequest;
import com.dto.WalletResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "wallet-service",
        configuration = FeignConfig.class
)
public interface WalletServiceClient {

    @GetMapping("/api/wallet/user/{userId}")
    WalletResponse getWallet(@PathVariable("userId") Long userId);

    @PostMapping("/api/wallet/debit")
    WalletResponse debitWallet(@RequestBody DebitWalletRequest request);

    @PostMapping("/api/wallet/credit")
    WalletResponse creditWallet(@RequestBody CreditWalletRequest request);
}
