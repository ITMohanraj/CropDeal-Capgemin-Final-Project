package com.cropdeal.priceservice.controller;

import com.cropdeal.priceservice.dto.CropPriceResponse;
import com.cropdeal.priceservice.dto.PagedPriceResponse;
import com.cropdeal.priceservice.dto.PriceRecommendationRequest;
import com.cropdeal.priceservice.dto.PriceRecommendationResponse;
import com.cropdeal.priceservice.dto.PriceSearchRequest;
import com.cropdeal.priceservice.dto.SyncResponse;
import com.cropdeal.priceservice.dto.SyncStatusResponse;
import com.cropdeal.priceservice.entity.MarketPrice;
import com.cropdeal.priceservice.service.PriceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/prices", "/api/v1/prices"})
@Tag(name = "Market & Government Pricing", description = "Endpoints for market prices, commodity lookup, and government data")
public class PriceController {

    private static final Logger log = LoggerFactory.getLogger(PriceController.class);
    private final PriceService priceService;

    public PriceController(PriceService priceService) {
        this.priceService = priceService;
    }

    /**
     * Server-side paginated and filtered mandi price records.
     * Suggested API: GET /api/prices?page=0&size=25&sortBy=arrivalDate&direction=desc
     */
    @GetMapping
    @Operation(summary = "Get paginated mandi prices", description = "Server-side pagination and multi-column filtering across all stored government mandi records")
    public PagedPriceResponse<MarketPrice> getPrices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "arrivalDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String market,
            @RequestParam(required = false) String commodity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate arrivalDate,
            @RequestParam(required = false) String search) {
        return priceService.getPricesPaged(page, size, sortBy, direction, state, district, market, commodity, arrivalDate, search);
    }

    /**
     * Get the latest sync metadata and timestamp in Asia/Kolkata timezone.
     */
    @GetMapping("/sync-status")
    @Operation(summary = "Get latest government sync status and timestamp", description = "Returns the status and last successful synchronization timestamp in Asia/Kolkata timezone")
    public ResponseEntity<SyncStatusResponse> getSyncStatus() {
        return ResponseEntity.ok(priceService.getSyncStatus());
    }

    /**
     * Manual trigger to sync government prices on-demand (Strictly Admin protected).
     */
    @PostMapping("/sync")
    @Operation(summary = "Manually synchronize government prices", description = "On-demand synchronization from data.gov.in. Prevents concurrent sync and strictly requires ADMIN authorization.")
    public ResponseEntity<?> syncGovernmentPrices(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        boolean isAdmin = false;
        if (userRole != null && !userRole.isBlank()) {
            String roleUpper = userRole.trim().toUpperCase();
            if (roleUpper.equals("ADMIN") || roleUpper.equals("ROLE_ADMIN")) {
                isAdmin = true;
            }
        }

        if (!isAdmin && authHeader != null && authHeader.startsWith("Bearer ")) {
            isAdmin = isTokenRoleAdmin(authHeader.substring(7));
        }

        if (!isAdmin) {
            log.warn("Unauthorized attempt to trigger government data synchronization. Provided role: '{}'", userRole);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "Access denied: Only administrators can trigger manual government data synchronization",
                    "error", "FORBIDDEN"
            ));
        }
        return ResponseEntity.ok(priceService.syncLatestGovernmentPrices());
    }

    private boolean isTokenRoleAdmin(String jwtToken) {
        if (jwtToken == null || jwtToken.isBlank()) return false;
        try {
            String[] parts = jwtToken.split("\\.");
            if (parts.length >= 2) {
                String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
                String upper = payload.toUpperCase();
                return upper.contains("\"ROLE\":\"ADMIN\"")
                        || upper.contains("\"ROLE\":\"ROLE_ADMIN\"")
                        || upper.contains("\"ADMIN\"")
                        || upper.contains("ROLE_ADMIN");
            }
        } catch (Exception e) {
            log.warn("Failed to inspect JWT token for admin role: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Searches district first, then state, while keeping the requested grade
     * isolated. Only the latest available arrival date is used.
     */
    @PostMapping("/lookup")
    @Operation(summary = "Lookup market crop price from database", description = "Queries database for latest arrival date price by commodity, state, district, grade")
    public CropPriceResponse lookupPrice(@Valid @RequestBody PriceSearchRequest request) {
        return priceService.getCropPrice(request);
    }

    /**
     * Location-based mandi price recommendation using the 4-priority matching engine.
     */
    @PostMapping("/recommendation")
    @Operation(summary = "Get location-based mandi price recommendation",
               description = "Determines appropriate market price from government database based on crop, farmer location/GPS coordinates, and nearest mandis")
    public ResponseEntity<PriceRecommendationResponse> getRecommendation(@Valid @RequestBody PriceRecommendationRequest request) {
        return ResponseEntity.ok(priceService.getRecommendedPrice(request));
    }

    /** Lookup latest database benchmark price directly by commodity name */
    @GetMapping("/commodity/{commodity}")
    @Operation(summary = "Lookup latest price by commodity name from database", description = "Finds latest stored database price for the given commodity")
    public ResponseEntity<CropPriceResponse> getPriceByCommodity(@PathVariable String commodity) {
        return priceService.getLatestPriceByCommodity(commodity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Validate crop price against database benchmark (used by chatbot and services) */
    @GetMapping("/validate")
    @Operation(summary = "Validate crop price against database benchmark")
    public ResponseEntity<CropPriceResponse> validateCropPrice(
            @RequestParam(required = false) String cropName,
            @RequestParam(required = false) String commodity) {
        String query = cropName != null ? cropName : commodity;
        return priceService.getLatestPriceByCommodity(query)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Returns latest-day aggregated prices for all crops available in the database. */
    @GetMapping("/all")
    @Operation(summary = "Get all latest crop prices from database", description = "Returns stored government and market prices for all crops in our database")
    public List<CropPriceResponse> getAllLatestPrices() {
        return priceService.getAllLatestCropPrices();
    }

    @GetMapping("/distinct/commodities")
    @Operation(summary = "Get distinct commodity names available in the database")
    public List<String> getDistinctCommodities() {
        return priceService.getDistinctCommodities();
    }

    @GetMapping("/distinct/states")
    @Operation(summary = "Get distinct state names available in the database")
    public List<String> getDistinctStates() {
        return priceService.getDistinctStates();
    }

    @GetMapping("/distinct/districts")
    @Operation(summary = "Get distinct district names optionally filtered by state")
    public List<String> getDistinctDistricts(@RequestParam(required = false) String state) {
        return priceService.getDistinctDistricts(state);
    }

    @GetMapping("/distinct/markets")
    @Operation(summary = "Get distinct market names optionally filtered by district")
    public List<String> getDistinctMarkets(@RequestParam(required = false) String district) {
        return priceService.getDistinctMarkets(district);
    }
}
