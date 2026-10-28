package com.repository;

import com.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByDealerId(Long dealerId);

    List<Order> findByFarmerId(Long farmerId);

    java.util.Optional<Order> findByTransactionId(String transactionId);

    java.util.Optional<Order> findFirstByDealerIdAndCropIdAndQuantityAndStatusNotOrderByCreatedAtDesc(
            Long dealerId, Long cropId, Integer quantity, com.entity.OrderStatus status);
}