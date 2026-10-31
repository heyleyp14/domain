# Build stage: compile and package with the same JDK the project targets.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

# Runtime stage: JRE only, unprivileged user.
FROM eclipse-temurin:17-jre
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
WORKDIR /app
COPY --from=build /app/target/domain-service-ferreteria-*.jar app.jar
USER app
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
