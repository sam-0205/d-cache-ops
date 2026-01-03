# D-CacheOps 🚀

D-CacheOps is a system-design–focused backend project that implements an **automated cache control plane** for microservices.

Instead of static cache rules, the system observes real API usage, analyzes recent traffic patterns, and dynamically decides:
- what to cache
- when to cache
- how long to cache (TTL)

## 🧠 Architecture Overview

- product-service: Stateless business API with Redis cache
- usage-collector: Observability service that stores usage metrics
- cache-control-plane: Decision engine that generates cache rules
- RabbitMQ: Async event pipeline
- PostgreSQL: Metrics storage
- Redis: Cache layer

## 🔁 Data Flow

Client → product-service → Redis / DB  
product-service → RabbitMQ → usage-collector → PostgreSQL  
cache-control-plane → product-service (dynamic cache rules)

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
- Docker
