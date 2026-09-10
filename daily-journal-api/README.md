# daily-journal-api

Spring Boot 3 REST API for the Daily Learning Journal — replaces the Next.js API routes.

## Stack
- Java 21 · Spring Boot 3.3 · Spring Data JPA · Hibernate 6
- PostgreSQL (Supabase) · hypersistence-utils (JSONB support)
- springdoc-openapi (Swagger UI at `/swagger-ui.html`)

## Prerequisites
- Java 21+
- Maven 3.9+ (or use `./mvnw` if you add the Maven wrapper)
- A running PostgreSQL instance (your existing Supabase project works)

## Setup

### 1. Run the one-off SQL migration
Open your Supabase SQL editor and run `src/main/resources/db/quote_cache.sql` to create the `quote_cache` table.

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/<db>
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=<your-password>
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-journal.vercel.app
```

> **Supabase tip:** find your direct Postgres connection string under  
> Project Settings → Database → Connection string → URI mode.  
> Replace `postgres://` with `jdbc:postgresql://`.

### 3. Run locally

```bash
mvn spring-boot:run \
  -DSPRING_DATASOURCE_URL=... \
  -DSPRING_DATASOURCE_USERNAME=... \
  -DSPRING_DATASOURCE_PASSWORD=... \
  -DCORS_ALLOWED_ORIGINS=http://localhost:3000
```

The API starts on **http://localhost:8080**.

### 4. Run the frontend

In a separate terminal (from the `daily-journal/` folder):

```bash
npm run dev
```

Frontend starts on **http://localhost:3000** and proxies API calls to `http://localhost:8080`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/entries` | All entry metadata (calendar dots) |
| GET | `/api/entries?from=&to=` | Full entries in a date range |
| GET | `/api/entries/{date}` | Single entry by date |
| PUT | `/api/entries/{date}` | Create/update today's entry |
| GET | `/api/quote` | Today's cached quote |
| GET | `/api/targets?type=&key=` | Get a target |
| PUT | `/api/targets?type=&key=` | Create/update a target |
| GET | `/api/targets/list?type=` | List all keys for a type |

Swagger UI: **http://localhost:8080/swagger-ui.html**

## Build & Deploy

### Docker
```bash
# Build image
docker build -t daily-journal-api .

# Run container
docker run -p 8080:8080 \
  -e SPRING_DATASOURCE_URL=... \
  -e SPRING_DATASOURCE_USERNAME=... \
  -e SPRING_DATASOURCE_PASSWORD=... \
  -e CORS_ALLOWED_ORIGINS=https://your-journal.vercel.app \
  daily-journal-api
```

### Platforms
Deploy to **Render**, **Railway**, or **Fly.io** using the Dockerfile above.  
Vercel does **not** support long-running JVM processes.

## JAR build
```bash
mvn package -DskipTests
java -jar target/daily-journal-api-*.jar
```
