package com.example.notification.repository;

import com.example.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipient(String recipient);

    List<Notification> findByOrderId(Long orderId);

    List<Notification> findByRecipientOrderByCreatedAtDesc(String recipient);

    List<Notification> findByRecipientInOrderByCreatedAtDesc(Collection<String> recipients);

    @Transactional
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.recipient IN :recipients")
    void markAllAsReadForRecipients(@Param("recipients") Collection<String> recipients);

    @Transactional
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.recipient IN :recipients")
    void deleteByRecipientIn(@Param("recipients") Collection<String> recipients);
}
