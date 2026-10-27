package com.cropdeal.priceservice.scheduler;

import com.cropdeal.priceservice.service.PriceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class GovernmentPriceScheduler {

    private static final Logger log = LoggerFactory.getLogger(GovernmentPriceScheduler.class);
    private final PriceService priceService;

    public GovernmentPriceScheduler(PriceService priceService) {
        this.priceService = priceService;
    }

    /**
     * Daily synchronization of government mandi price data scheduled at 2:00 AM IST.
     */
    @Scheduled(cron = "${government.api.sync-cron:0 0 2 * * *}", zone = "Asia/Kolkata")
    public void synchronizeGovernmentPrices() {
        log.info("Executing scheduled government price sync job at 02:00 AM IST (Asia/Kolkata)");
        try {
            priceService.syncLatestGovernmentPrices();
        } catch (Exception e) {
            log.error("Scheduled government price synchronization failed: {}", e.getMessage(), e);
        }
    }
}
