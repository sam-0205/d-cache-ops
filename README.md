# D-CacheOps 🚀

D-CacheOps is a system-design–focused backend project that implements an **automated cache control plane** for microservices.

Instead of static cache rules, the system observes real API usage, analyzes recent traffic patterns, and dynamically decides:
- what to cache
- when to cache
- how long to cache (TTL)

## 🧠 Architecture Overview

- product-service: Stateless business API with Redis cache
- user-service: Stateless business API with Redis cache
- usage-collector: Observability service that stores usage metrics
- cache-control-plane: Decision engine that generates cache rules
- dashboard: Metrics API backed by PostgreSQL
- dashboard-ui: React-based visualization dashboard
- RabbitMQ: Async event pipeline
- PostgreSQL: Metrics storage
- Redis: Cache layer

## 🔁 Data Flow

Client → product-service / user-service → Redis / Data Source  
product-service / user-service → RabbitMQ → usage-collector → PostgreSQL  
cache-control-plane → services (dynamic cache rules)  
dashboard-ui → dashboard → PostgreSQL  

## 🎯 Why this project?

Most applications use **manual, static caching**.  
D-CacheOps demonstrates how caching decisions can be:
- data-driven
- automatic
- adaptive

This project focuses on **system design**, not AI/ML.

## 🛠 Tech Stack

- Node.js
- Redis
- RabbitMQ
- PostgreSQL
- React (Vite)
- Docker
- pnpm

---

## 🚀 Local Setup (Step-by-Step)

### 1️⃣ Prerequisites

Make sure you have the following installed:
- Node.js (v18+)
- pnpm
- Docker

Verify:
```bash
node -v
pnpm -v
docker --version
```

###  2️⃣ Clone the Repository
git clone https://github.com/sam-0205/d-cache-ops.git

cd d-cache-ops

### 3️⃣ Start Infrastructure Services
Run:
```bash
docker run -d --name redis-cache -p 6379:6379 redis
docker run -d --name rabbitmq -p 5672:5672 rabbitmq
docker run -d --name postgres-db -p 5432:5432 \
  -e POSTGRES_USER=usage_user \
  -e POSTGRES_PASSWORD=usage_pass \
  -e POSTGRES_DB=usage_db \
  postgres
```
Confirm containers are running:
```bash
docker ps
```

### 4️⃣ Install Dependencies
Run:
```bash
cd product-service && pnpm install
cd ../user-service && pnpm install
cd ../usage-collector && pnpm install
cd ../cache-control-plane && pnpm install
cd ../dashboard && pnpm install
cd ../dashboard-ui && pnpm install
```

### 5️⃣ Start Backend Services (Open separate terminals)
Terminal 1 – usage-collector
```bash
cd usage-collector
node index.js
```
Terminal 2 – product-service
```bash
cd product-service
node app.js
```
Terminal 3 – user-service
```bash
cd user-service
node app.js
```
Terminal 4 – cache-control-plane
```bash
cd cache-control-plane
node index.js
```
Terminal 5 – dashboard backend
```bash
cd dashboard-backend
node index.js
```

### 6️⃣ Start React Dashboard UI
```bash
cd dashboard-frontend
pnpm run dev
```
Open:
```bash
http://localhost:5173
```

### 7️⃣ Generate Traffic
```bash
curl http://localhost:3001/products/1
curl http://localhost:3002/users/1
```

Repeat requests multiple times.

After ~1 minute:
- cache rules will be applied automatically
- Redis cache hits will increase
- dashboard will show live metrics


### 📊 Dashboard Endpoints
- GET /metrics/services
- GET /metrics/endpoints
