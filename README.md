# Redis Practice

<p align="center">
  <img src="https://img.shields.io/badge/Language-Go%201.25-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go 1.25" />
  <img src="https://img.shields.io/badge/Backend-Gin-008ECF?style=flat-square&logo=gin&logoColor=white" alt="Gin" />
  <img src="https://img.shields.io/badge/Cache-Redis%207-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7" />
  <img src="https://img.shields.io/badge/Database-MySQL%208-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL 8" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="React and Vite" />
  <img src="https://img.shields.io/badge/Dev-Docker%20Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
</p>

A hands-on project for exploring common Redis caching scenarios in a backend application. MySQL serves as the source of truth, Redis provides the cache, and an interactive dashboard displays cache hits, cache misses, and database queries in real time.

## Practice Scenarios

| Scenario | Goal |
| --- | --- |
| Cache Aside | Observe the first read querying MySQL and subsequent reads being served by Redis |
| Stale Cache | Compare stale data without invalidation against fresh data after enabling invalidation |
| TTL | Compare keys without expiration against keys that expire after 30 seconds |
| Negative Caching | Cache `NOT FOUND` results briefly to reduce repeated queries for missing IDs |
| Cache Stampede | Observe concurrent requests and how SingleFlight reduces duplicate MySQL queries |
| Rate Limiting | Use an atomic Redis Lua script to enforce a weighted sliding-window quota per client |

## Tech Stack

### Backend

- Go 1.25
- Gin
- GORM
- go-redis v9
- MySQL 8
- Redis 7
- Flyway

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Development

- Docker
- Docker Compose

## How It Works

The basic cache-aside flow:

```text
Client
  │
  ▼
GET /api/v1/products/:id
  │
  ▼
Check Redis
  │
  ├── Cache hit ───────────────▶ Return product
  │
  └── Cache miss
          │
          ▼
       Query MySQL
          │
          ▼
       Write to Redis
          │
          ▼
       Return product
```

The backend publishes events such as `CACHE HIT`, `CACHE MISS`, `CACHE SET`, and `DATABASE QUERY` through Server-Sent Events (SSE), allowing the dashboard to display activity in real time.

## Project Structure

```text
.
├── cmd/api/                 Backend entry point
├── config/                  Environment configuration
├── internal/
│   ├── controller/          HTTP handlers and routes
│   ├── middleware/          HTTP rate-limit enforcement
│   ├── service/             Product and caching workflows
│   ├── repository/          MySQL access
│   ├── cache/               Redis access
│   ├── model/               Product model
│   ├── demo/                Scenarios and metrics
│   ├── concurrency/         In-process SingleFlight
│   └── events/              SSE event broadcasting
├── migrations/              Flyway SQL migrations
├── frontend/                React dashboard
├── docker-compose.yml
└── Dockerfile
```

## Requirements

The simplest way to run the project is with:

- Docker Desktop or Docker Engine
- Docker Compose v2

You do not need to install Go, Node.js, MySQL, or Redis locally when using Docker Compose.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/huylhn1810/redis-practice.git
cd redis-practice
```

### 2. Create the environment file

Linux or macOS:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

The defaults in `.env.example` work with Docker Compose. Replace the credentials before deploying to another environment.

### 3. Build and start the application

```bash
docker compose up --build
```

Docker Compose will:

1. Start MySQL and Redis.
2. Wait for MySQL to become healthy.
3. Run the Flyway migration.
4. Start the backend and frontend.

### 4. Open the application

| Component | Default address |
| --- | --- |
| Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8080/api/v1 |
| MySQL | `localhost:3306` |
| Redis | `localhost:6379` |

## Using the Dashboard

1. Open `http://localhost:3000`.
2. Select **Seed Product #1** to create the sample data.
3. Select a Redis scenario.
4. Choose **Before** or **After** when the scenario supports both modes.
5. Run the actions in the order shown on the dashboard.
6. Observe the MySQL state, Redis state, metrics, and event log.

Use **Flush Redis** before a scenario when you need a cold cache. Use **Reset** to restore the default scenario and reset the metrics.

## API Reference

### Products

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/products` | Create a product |
| `GET` | `/api/v1/products` | Retrieve all products directly from MySQL |
| `GET` | `/api/v1/products/:id` | Retrieve a product using cache-aside |
| `PUT` | `/api/v1/products/:id` | Update a product |
| `DELETE` | `/api/v1/products/:id` | Delete a product |
| `DELETE` | `/api/v1/products` | Remove all products for demo purposes |

Example product request:

```json
{
  "id": 1,
  "name": "Mechanical Keyboard",
  "price": 100,
  "stock": 50
}
```

For updates, the backend uses the `:id` URL parameter. The `id` field is not required in the request body.

### Cache and Demo

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/cache` | Inspect cached products |
| `DELETE` | `/api/v1/cache` | Flush the Redis database |
| `POST` | `/api/v1/demo/scenario` | Select a scenario |
| `POST` | `/api/v1/demo/reset` | Reset the scenario and metrics |
| `GET` | `/api/v1/demo/config` | Retrieve the active cache policy |
| `GET` | `/api/v1/demo/metrics` | Retrieve cache and database metrics |
| `GET` | `/api/v1/demo/events` | Receive the SSE event stream |
| `POST` | `/api/v1/demo/stampede` | Run 100 concurrent goroutines |
| `POST` | `/api/v1/demo/ratelimit` | Probe the Redis-backed rate limiter |

Supported backend scenario keys:

```text
stale-before
stale-after
ttl-before
ttl-after
negative-before
negative-after
stampede-before
stampede-after
```

Example scenario selection:

```bash
curl -X POST http://localhost:8080/api/v1/demo/scenario \
  -H "Content-Type: application/json" \
  -d '{"scenario":"ttl-after"}'
```

Example rate-limit probe:

```bash
curl -i -X POST http://localhost:8080/api/v1/demo/ratelimit \
  -H "X-Demo-Client-ID: client-a"
```

The response contains the estimated request count, remaining quota, and reset timing. When the quota is exceeded, the endpoint returns `429 Too Many Requests` with a `Retry-After` header. `MAX_REQUESTS` and `WINDOW_SECONDS` in `.env` control the policy.

## Stopping the Application

```bash
docker compose down
```

MySQL and Redis use local data directories, so their data remains available after the containers stop:

```text
mysql_data/
redis_data/
```

Both directories are excluded from Git.

## Backend Checks

If Go is installed locally:

```bash
go test ./...
go vet ./...
```

The project currently focuses on Redis practice and does not include automated tests.

## Notes

- A TTL of `0` means the cached key does not expire automatically.
- Negative caching uses a short TTL so that `NOT FOUND` entries do not remain indefinitely.
- Redis read failures fall back to MySQL, allowing read requests to continue when the cache is unavailable.
- SingleFlight only coalesces requests inside one backend process; it is not a distributed lock across multiple instances.
- The rate-limit endpoint uses `X-Demo-Client-ID` only to make client isolation easy to experiment with. A production API should derive a trusted identity from authentication or a correctly configured reverse proxy.
