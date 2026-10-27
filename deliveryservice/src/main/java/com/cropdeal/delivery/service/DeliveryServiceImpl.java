package com.cropdeal.delivery.service;

import com.cropdeal.delivery.dto.DeliveryAssignmentRequest;
import com.cropdeal.delivery.dto.DeliveryResponse;
import com.cropdeal.delivery.dto.RefundRequest;
import com.cropdeal.delivery.dto.ReturnRequest;
import com.cropdeal.delivery.dto.UpdateDeliveryStatusRequest;
import com.cropdeal.delivery.entity.AssignmentStatus;
import com.cropdeal.delivery.entity.Delivery;
import com.cropdeal.delivery.entity.DeliveryAssignment;
import com.cropdeal.delivery.entity.DeliveryStatus;
import com.cropdeal.delivery.entity.DeliveryStatusHistory;
import com.cropdeal.delivery.entity.RefundStatus;
import com.cropdeal.delivery.entity.ReturnStatus;
import com.cropdeal.delivery.exception.DeliveryNotFoundException;
import com.cropdeal.delivery.repository.DeliveryAssignmentRepository;
import com.cropdeal.delivery.repository.DeliveryRepository;
import com.cropdeal.delivery.repository.DeliveryStatusHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DeliveryServiceImpl implements DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final DeliveryAssignmentRepository assignmentRepository;
    private final DeliveryStatusHistoryRepository statusHistoryRepository;

    public DeliveryServiceImpl(
            DeliveryRepository deliveryRepository,
            DeliveryAssignmentRepository assignmentRepository,
            DeliveryStatusHistoryRepository statusHistoryRepository) {

        this.deliveryRepository = deliveryRepository;
        this.assignmentRepository = assignmentRepository;
        this.statusHistoryRepository = statusHistoryRepository;
    }

    @Override
    public DeliveryResponse createDelivery(
            DeliveryAssignmentRequest request) {

        Delivery delivery = new Delivery();
        delivery.setOrderId(request.getOrderId());
        delivery.setDeliveryAgentId(request.getDeliveryAgentId());
        delivery.setPickupAddress(request.getPickupAddress());
        delivery.setDeliveryAddress(request.getDeliveryAddress());
        java.math.BigDecimal dist = request.getDistanceKm() != null && request.getDistanceKm().compareTo(java.math.BigDecimal.ZERO) > 0
                ? request.getDistanceKm()
                : java.math.BigDecimal.valueOf(15);
        java.math.BigDecimal fee = request.getDeliveryFee() != null && request.getDeliveryFee().compareTo(java.math.BigDecimal.ZERO) > 0
                ? request.getDeliveryFee()
                : dist.multiply(java.math.BigDecimal.valueOf(10));

        delivery.setDistanceKm(dist);
        delivery.setDeliveryFee(fee);
        delivery.setFeePaid(true);
        delivery.setFulfillmentType("DELIVERY_PARTNER");
        delivery.setDealerId(request.getDealerId());
        delivery.setDealerName(request.getDealerName());
        delivery.setDealerPhone(request.getDealerPhone());
        delivery.setFarmerId(request.getFarmerId());
        delivery.setFarmerName(request.getFarmerName());
        delivery.setFarmerPhone(request.getFarmerPhone());
        delivery.setCropName(request.getCropName());
        delivery.setCropQuantity(request.getCropQuantity());
        delivery.setCropUnit(request.getCropUnit());

        if (request.getDeliveryAgentId() != null) {
            delivery.setStatus(DeliveryStatus.ASSIGNED);
        } else {
            delivery.setStatus(DeliveryStatus.AVAILABLE_FOR_PICKUP);
        }

        Delivery savedDelivery = deliveryRepository.save(delivery);

        if (request.getDeliveryAgentId() != null) {
            DeliveryAssignment assignment = new DeliveryAssignment();
            assignment.setDeliveryId(savedDelivery.getId());
            assignment.setDeliveryAgentId(request.getDeliveryAgentId());
            assignment.setStatus(AssignmentStatus.ASSIGNED);
            assignmentRepository.save(assignment);
            saveStatusHistory(savedDelivery, "Delivery created and assigned");
        } else {
            saveStatusHistory(savedDelivery, "Delivery created and added to Global Pool (Fee: ₹" + fee + " for " + dist + " km)");
        }

        return mapToResponse(savedDelivery);
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryResponse getDeliveryById(
            Long deliveryId) {

        return mapToResponse(getDelivery(deliveryId));
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryResponse getDeliveryByOrderId(
            Long orderId) {

        Delivery delivery = deliveryRepository.findByOrderId(orderId)
                .orElseThrow(
                        () -> new DeliveryNotFoundException(
                                "Delivery not found for order: " + orderId
                        )
                );

        return mapToResponse(delivery);
    }

    @Override
    public DeliveryResponse updateDeliveryStatus(
            Long deliveryId,
            UpdateDeliveryStatusRequest request) {

        Delivery delivery = getDelivery(deliveryId);
        DeliveryStatus status = parseEnum(
                DeliveryStatus.class,
                request.getStatus(),
                "Invalid delivery status"
        );

        delivery.setStatus(status);

        Delivery saved = deliveryRepository.save(delivery);
        saveStatusHistory(saved, "Delivery status updated");

        return mapToResponse(saved);
    }

    @Override
    public void cancelDelivery(
            Long deliveryId) {

        Delivery delivery = getDelivery(deliveryId);
        delivery.setStatus(DeliveryStatus.CANCELLED);

        Delivery saved = deliveryRepository.save(delivery);
        saveStatusHistory(saved, "Delivery cancelled");
    }

    @Override
    public DeliveryResponse requestReturn(
            Long deliveryId,
            ReturnRequest request) {

        Delivery delivery = getDelivery(deliveryId);
        delivery.setReturnStatus(ReturnStatus.RETURN_REQUESTED);

        Delivery saved = deliveryRepository.save(delivery);
        saveStatusHistory(saved, "Return requested: " + request.getReason());

        return mapToResponse(saved);
    }

    @Override
    public DeliveryResponse approveReturn(
            Long deliveryId) {

        Delivery delivery = getDelivery(deliveryId);
        delivery.setReturnStatus(ReturnStatus.RETURN_APPROVED);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    public DeliveryResponse rejectReturn(
            Long deliveryId,
            String reason) {

        Delivery delivery = getDelivery(deliveryId);
        delivery.setReturnStatus(ReturnStatus.RETURN_REJECTED);

        Delivery saved = deliveryRepository.save(delivery);
        saveStatusHistory(saved, "Return rejected: " + reason);

        return mapToResponse(saved);
    }

    @Override
    public DeliveryResponse updateReturnStatus(
            Long deliveryId,
            String status) {

        Delivery delivery = getDelivery(deliveryId);
        ReturnStatus returnStatus = parseEnum(
                ReturnStatus.class,
                status,
                "Invalid return status"
        );

        delivery.setReturnStatus(returnStatus);

        return mapToResponse(deliveryRepository.save(delivery));
    }

    @Override
    public DeliveryResponse requestRefund(
            Long deliveryId,
            RefundRequest request) {

        // Refund between dealer and farmer is not supported; all transactions and deals are final
        throw new UnsupportedOperationException(
                "Refund option between dealer and farmer is not supported. All crop transactions and deals between dealer and farmer are final."
        );
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryResponse getRefundStatus(
            Long deliveryId) {

        return mapToResponse(getDelivery(deliveryId));
    }

    private Delivery getDelivery(
            Long deliveryId) {

        return deliveryRepository.findById(deliveryId)
                .orElseThrow(
                        () -> new DeliveryNotFoundException(
                                "Delivery not found: " + deliveryId
                        )
                );
    }

    private void saveStatusHistory(
            Delivery delivery,
            String remarks) {

        DeliveryStatusHistory history = new DeliveryStatusHistory();
        history.setDeliveryId(delivery.getId());
        history.setStatus(delivery.getStatus());
        history.setUpdatedByAgentId(delivery.getDeliveryAgentId());
        history.setRemarks(remarks);

        statusHistoryRepository.save(history);
    }

    private DeliveryResponse mapToResponse(
            Delivery delivery) {

        DeliveryResponse response = new DeliveryResponse();
        response.setDeliveryId(delivery.getId());
        response.setOrderId(delivery.getOrderId());
        response.setDeliveryAgentId(delivery.getDeliveryAgentId());
        response.setPickupAddress(delivery.getPickupAddress());
        response.setDeliveryAddress(delivery.getDeliveryAddress());
        response.setStatus(delivery.getStatus().name());
        response.setOtpVerified(delivery.isOtpVerified());
        response.setReturnStatus(delivery.getReturnStatus() != null ? delivery.getReturnStatus().name() : ReturnStatus.NONE.name());
        response.setRefundStatus(delivery.getRefundStatus() != null ? delivery.getRefundStatus().name() : RefundStatus.NONE.name());
        response.setCreatedAt(delivery.getCreatedAt());
        response.setUpdatedAt(delivery.getUpdatedAt());
        response.setDeliveryFee(delivery.getDeliveryFee());
        response.setFeePaid(delivery.isFeePaid());
        response.setFulfillmentType(delivery.getFulfillmentType());
        response.setDealerId(delivery.getDealerId());
        response.setDealerName(delivery.getDealerName());
        response.setDealerPhone(delivery.getDealerPhone());
        response.setFarmerId(delivery.getFarmerId());
        response.setFarmerName(delivery.getFarmerName());
        response.setFarmerPhone(delivery.getFarmerPhone());
        response.setCropName(delivery.getCropName());
        response.setCropQuantity(delivery.getCropQuantity());
        response.setCropUnit(delivery.getCropUnit());
        response.setDistanceKm(delivery.getDistanceKm());

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.List<DeliveryResponse> getGlobalPool() {
        return deliveryRepository.findByStatus(DeliveryStatus.AVAILABLE_FOR_PICKUP)
                .stream()
                .filter(d -> !isSelfPickup(d))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public DeliveryResponse claimDelivery(Long deliveryId, Long deliveryAgentId) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new DeliveryNotFoundException("Delivery not found with id: " + deliveryId));

        if (delivery.getStatus() != DeliveryStatus.AVAILABLE_FOR_PICKUP) {
            throw new IllegalStateException("Delivery is not available in the global pool or already claimed. Current status: " + delivery.getStatus());
        }

        delivery.setDeliveryAgentId(deliveryAgentId);
        delivery.setStatus(DeliveryStatus.ASSIGNED);
        Delivery saved = deliveryRepository.save(delivery);

        DeliveryAssignment assignment = new DeliveryAssignment();
        assignment.setDeliveryId(saved.getId());
        assignment.setDeliveryAgentId(deliveryAgentId);
        assignment.setStatus(AssignmentStatus.ASSIGNED);
        assignmentRepository.save(assignment);

        saveStatusHistory(saved, "Delivery claimed from Global Pool by agent " + deliveryAgentId);
        return mapToResponse(saved);
    }

    @Override
    public DeliveryResponse createSelfPickup(Long orderId, String pickupAddress) {
        Delivery delivery = new Delivery();
        delivery.setOrderId(orderId);
        delivery.setPickupAddress(pickupAddress);
        delivery.setDeliveryAddress("N/A - Self Pickup by Dealer");
        delivery.setStatus(DeliveryStatus.SELF_PICKUP);
        delivery.setDistanceKm(java.math.BigDecimal.ZERO);
        delivery.setDeliveryFee(java.math.BigDecimal.ZERO);
        delivery.setFeePaid(true);
        delivery.setFulfillmentType("SELF_PICKUP");
        delivery.setDeliveryAgentId(null);

        Delivery saved = deliveryRepository.save(delivery);
        saveStatusHistory(saved, "Order designated for Self-Pickup by Dealer");
        return mapToResponse(saved);
    }

    @Override
    public java.util.List<DeliveryResponse> getAllDeliveries() {
        return deliveryRepository.findAll().stream()
                .filter(d -> !isSelfPickup(d))
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public java.util.List<DeliveryResponse> getDeliveriesByAgent(Long agentId) {
        return deliveryRepository.findByDeliveryAgentId(agentId).stream()
                .filter(d -> !isSelfPickup(d))
                .map(this::mapToResponse)
                .toList();
    }

    private boolean isSelfPickup(Delivery d) {
        if (d == null) return false;
        if (d.getStatus() == DeliveryStatus.SELF_PICKUP) return true;
        if (d.getFulfillmentType() != null && d.getFulfillmentType().toUpperCase().contains("SELF")) return true;
        if (d.getDeliveryAddress() != null && d.getDeliveryAddress().toLowerCase().contains("self pickup")) return true;
        return false;
    }

    private <T extends Enum<T>> T parseEnum(
            Class<T> enumType,
            String value,
            String errorMessage) {

        try {
            return Enum.valueOf(
                    enumType,
                    value.trim().toUpperCase()
            );
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    errorMessage + ": " + value
            );
        }
    }
}
