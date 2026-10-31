# Override for the course Dockerfile (authcore/Dockerfile), which pins
# gradle:8.10-jdk21 while Spring Boot 4.1.1 requires Gradle 8.14+ or 9.x.
# Kept outside authcore/ so the professor's code is not modified (R1).
FROM gradle:9.7.1-jdk21 AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle clean bootJar -x test --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
