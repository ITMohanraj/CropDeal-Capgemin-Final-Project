package com.cropdeal.gateway.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQGatewayConfig {

    public static final String EXCHANGE = "cropdeal.notification.exchange";
    public static final String QUEUE = "cropdeal.notification.queue";
    public static final String ROUTING_KEY = "notification";

    public static final String PRICE_ALERT_QUEUE = "cropdeal.price-alert.queue";
    public static final String PRICE_ALERT_ROUTING_KEY = "price.#";

    @Bean
    public TopicExchange notificationExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue notificationQueue() {
        return new Queue(QUEUE, true);
    }

    @Bean
    public Binding notificationBinding(Queue notificationQueue, TopicExchange notificationExchange) {
        return BindingBuilder.bind(notificationQueue).to(notificationExchange).with(ROUTING_KEY);
    }

    @Bean
    public Queue priceAlertQueue() {
        return new Queue(PRICE_ALERT_QUEUE, true);
    }

    @Bean
    public Binding priceAlertBinding(Queue priceAlertQueue, TopicExchange notificationExchange) {
        return BindingBuilder.bind(priceAlertQueue).to(notificationExchange).with(PRICE_ALERT_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter);
        return template;
    }
}
