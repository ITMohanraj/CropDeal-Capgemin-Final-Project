package com.repository;

import com.entity.OrderSagaInstance;
import com.entity.SagaStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderSagaRepository extends JpaRepository<OrderSagaInstance, Long> {

    Optional<OrderSagaInstance> findBySagaId(String sagaId);

    Optional<OrderSagaInstance> findByOrderId(Long orderId);

    List<OrderSagaInstance> findByStatusIn(List<SagaStatus> statuses);
}
