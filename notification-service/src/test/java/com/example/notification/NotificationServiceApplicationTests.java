package com.example.notification;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
    "spring.cloud.config.enabled=false",
    "spring.datasource.url=jdbc:mysql://localhost:3306/cropdeal_notification_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC",
    "eureka.client.enabled=false"
})
class NotificationServiceApplicationTests {

    @Test
    void contextLoads() {
    }
}
