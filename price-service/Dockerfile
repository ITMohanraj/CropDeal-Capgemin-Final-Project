FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache tzdata
ENV TZ=Asia/Kolkata
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-Duser.timezone=Asia/Kolkata", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
