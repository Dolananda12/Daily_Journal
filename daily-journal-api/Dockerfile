# Build stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src

# Download dependencies (cached layer)
RUN apk add --no-cache maven && mvn dependency:go-offline -q

# Build the fat JAR
RUN mvn package -DskipTests -q

# ─────────────────────────────────────────────────
# Runtime stage — slim JRE image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy only the final JAR
COPY --from=build /app/target/daily-journal-api-*.jar app.jar

EXPOSE 8080

# Run with explicit UTF-8 and sensible memory settings
ENTRYPOINT ["java", \
  "-Dfile.encoding=UTF-8", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "/app/app.jar"]
