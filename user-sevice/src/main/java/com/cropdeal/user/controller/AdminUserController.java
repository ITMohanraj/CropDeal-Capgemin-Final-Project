package com.cropdeal.user.controller;

import com.cropdeal.user.client.AuthServiceClient;
import com.cropdeal.user.dto.*;
import com.cropdeal.user.entity.Dealer;
import com.cropdeal.user.entity.DeliveryPartner;
import com.cropdeal.user.entity.Farmer;
import com.cropdeal.user.repository.DealerRepository;
import com.cropdeal.user.repository.DeliveryPartnerRepository;
import com.cropdeal.user.repository.FarmerRepository;
import com.cropdeal.user.service.DealerService;
import com.cropdeal.user.service.DeliveryPartnerService;
import com.cropdeal.user.service.FarmerReviewService;
import com.cropdeal.user.service.FarmerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private static final Logger log = LoggerFactory.getLogger(AdminUserController.class);

    private final FarmerService farmerService;
    private final DealerService dealerService;
    private final DeliveryPartnerService deliveryPartnerService;
    private final FarmerRepository farmerRepository;
    private final DealerRepository dealerRepository;
    private final DeliveryPartnerRepository deliveryPartnerRepository;
    private final AuthServiceClient authServiceClient;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public AdminUserController(
            FarmerService farmerService,
            DealerService dealerService,
            DeliveryPartnerService deliveryPartnerService,
            FarmerRepository farmerRepository,
            DealerRepository dealerRepository,
            DeliveryPartnerRepository deliveryPartnerRepository,
            AuthServiceClient authServiceClient,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate
    ) {
        this.farmerService = farmerService;
        this.dealerService = dealerService;
        this.deliveryPartnerService = deliveryPartnerService;
        this.farmerRepository = farmerRepository;
        this.dealerRepository = dealerRepository;
        this.deliveryPartnerRepository = deliveryPartnerRepository;
        this.authServiceClient = authServiceClient;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserManagementSummaryResponse>> getAllUsers(
            @RequestParam(required = false) String role
    ) {
        List<UserManagementSummaryResponse> userSummaries = new ArrayList<>();

        try {
            String sql = "SELECT u.id as userId, u.username, u.email, u.role, u.status, " +
                         "COALESCE(f.name, d.name, dp.name, u.username) as name, " +
                         "COALESCE(f.phone, d.phone, dp.phone, '') as phone, " +
                         "COALESCE(f.address, d.address, dp.address, '') as address, " +
                         "COALESCE(f.average_rating, 0.0) as rating, " +
                         "COALESCE(f.farm_location, d.business_name, dp.vehicle_type, '') as details " +
                         "FROM cropdeal_auth_db.users u " +
                         "LEFT JOIN cropdeal_user_db.farmers f ON u.id = f.user_id " +
                         "LEFT JOIN cropdeal_user_db.dealers d ON u.id = d.user_id " +
                         "LEFT JOIN cropdeal_user_db.delivery_partners dp ON u.id = dp.user_id";

            if (role != null && !role.isBlank() && !role.equalsIgnoreCase("ALL")) {
                sql += " WHERE u.role = '" + role.toUpperCase().replace("ROLE_", "") + "'";
            }

            userSummaries = jdbcTemplate.query(sql, (rs, rowNum) -> {
                UserManagementSummaryResponse resp = new UserManagementSummaryResponse();
                resp.setUserId(rs.getLong("userId"));
                resp.setName(rs.getString("name"));
                resp.setUsername(rs.getString("username"));
                resp.setEmail(rs.getString("email"));
                resp.setPhone(rs.getString("phone"));
                resp.setRole(rs.getString("role"));
                resp.setStatus(rs.getString("status"));
                resp.setAddress(rs.getString("address"));
                resp.setRating(rs.getDouble("rating"));
                resp.setAdditionalInfo(rs.getString("details"));
                return resp;
            });
        } catch (Exception e) {
            log.error("Failed to query live users via cross-db join: {}", e.getMessage());
        }

        return ResponseEntity.ok(userSummaries);
    }

    @GetMapping("/farmers")
    public ResponseEntity<List<FarmerResponse>> getAllFarmers() {
        return ResponseEntity.ok(farmerService.getAllFarmers());
    }

    @GetMapping("/dealers")
    public ResponseEntity<List<DealerResponse>> getAllDealers() {
        return ResponseEntity.ok(dealerService.getAllDealers());
    }

    @GetMapping("/delivery-partners")
    public ResponseEntity<List<DeliveryPartnerResponse>> getAllDeliveryPartners() {
        return ResponseEntity.ok(deliveryPartnerService.getAllDeliveryPartners());
    }

    @PostMapping("/users/{userId}/block")
    public ResponseEntity<Map<String, Object>> blockUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "Blocked by Administrator") String reason,
            HttpServletRequest httpRequest
    ) {
        if (userId != null && userId == 4L) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Bad Request",
                    "message", "Administrator account cannot be blocked"
            ));
        }

        farmerRepository.findByUserId(userId).ifPresent(f -> {
            f.setIsBlocked(true);
            farmerRepository.save(f);
            log.info("Farmer with userId {} marked as blocked", userId);
        });

        String authHeader = httpRequest.getHeader("Authorization");
        try {
            authServiceClient.updateUserStatus(userId, new UserStatusUpdateRequest("SUSPENDED"), authHeader);
        } catch (Exception e) {
            log.warn("Could not synchronize SUSPENDED status to auth-service for userId {}: {}", userId, e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "message", "User blocked successfully",
                "userId", userId,
                "status", "BLOCKED",
                "reason", reason
        ));
    }

    @PostMapping("/users/{userId}/unblock")
    public ResponseEntity<Map<String, Object>> unblockUser(
            @PathVariable Long userId,
            HttpServletRequest httpRequest
    ) {
        farmerRepository.findByUserId(userId).ifPresent(f -> {
            f.setIsBlocked(false);
            farmerRepository.save(f);
            log.info("Farmer with userId {} marked as unblocked", userId);
        });

        String authHeader = httpRequest.getHeader("Authorization");
        try {
            authServiceClient.updateUserStatus(userId, new UserStatusUpdateRequest("ACTIVE"), authHeader);
        } catch (Exception e) {
            log.warn("Could not synchronize ACTIVE status to auth-service for userId {}: {}", userId, e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "message", "User unblocked successfully",
                "userId", userId,
                "status", "ACTIVE"
        ));
    }

    @PutMapping("/users/{userId}/status")
    public ResponseEntity<MessageResponse> updateUserStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UserStatusUpdateRequest request,
            HttpServletRequest httpRequest
    ) {
        String authHeader = httpRequest.getHeader("Authorization");
        return authServiceClient.updateUserStatus(userId, request, authHeader);
    }
}
