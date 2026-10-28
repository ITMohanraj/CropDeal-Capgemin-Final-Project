package com.client;

import com.config.FeignConfig;
import com.dto.CropResponse;
import com.dto.QuantityUpdateRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "crop-service",
        configuration = FeignConfig.class
)
public interface CropServiceClient {

    @GetMapping("/api/crops/{id}")
    CropResponse getCropById(@PathVariable("id") Long id);

    @PutMapping("/api/crops/{id}/quantity")
    CropResponse reduceQuantity(@PathVariable("id") Long id, @RequestBody QuantityUpdateRequest request);

    @PutMapping("/api/crops/{id}/restore-quantity")
    CropResponse restoreQuantity(@PathVariable("id") Long id, @RequestBody QuantityUpdateRequest request);
}
