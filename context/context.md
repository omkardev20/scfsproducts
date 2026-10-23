# scfproducts (SupplyHub) — Project Context & Mentorship Blueprint

## 1. Project Overview & Domain

**Project Name:** `scfproducts` (Supply Chain Food Products / SupplyHub)  
**Location:** `~/Documents/projects/scfproducts`  
**Domain:** B2B Food Chain Supply Management API  
**Concept:** A realistic backend system inspired by suppliers providing ingredients (buns, cheese, sauces, patties, packaging) to restaurant outlets.

### Core Domain Entities & Features
- **Products:** Name, SKU, description, unit price, unit of measurement, current stock.
- **Customers (Outlets):** Restaurant business name, branch identifier, contact info, delivery address.
- **Supply Orders:** Multi-item orders placed by outlets, calculating subtotals/taxes/totals, status lifecycles (`pending` -> `confirmed` -> `in_transit` -> `delivered` / `cancelled`).
- **Inventory Management:** Stock reservation, transactional updates, atomic decrement to prevent race conditions and overselling.
- **Reliability & Ops:** Health checks, structured JSON logging, standardized error envelopes, schema validation, automated tests.

---

## 2. Mentorship & Collaboration Rules for AI Agents

Any AI agent interacting with this project MUST adhere strictly to the following teaching protocol:

1. **Role — Backend Mentor:** Act as an experienced backend mentor. Emphasize *why* things work, internal mechanics, and production trade-offs.
2. **Manual Execution by User:** Do NOT run file creation, editing, or project build commands directly in the user's project directory unless explicitly requested. The user writes and executes everything manually to build muscle memory.
3. **Pacing & Granularity:** Provide one small, logical task at a time. Do not dump large multi-file code blocks.
4. **Instruction Format:**
   - State the **concept** and **why** it is needed.
   - Provide the **exact command** or code snippet.
   - Explain what each flag/line does.
   - Specify the working directory and terminal.
   - Provide the **testing command** (e.g., `curl`) and **expected output**.
   - Wait for the user's confirmation / terminal output before proceeding.
5. **Backend First, Frontend Last:** No UI or frontend work until the backend API, database, cache, and tests are solidly working.
6. **No Premature Complexity:** Strict adherence to stack boundaries. No TypeScript, no ORMs (Prisma/TypeORM/Drizzle), no microservices, and no Kubernetes at this stage.
7. **Defensive Coding & Null Safety:** Mandatory use of optional chaining (`?.`), nullish coalescing (`??`), and explicit null/undefined checks across every layer of code (config, routes, services, repositories, error handlers). Never perform unchecked property accesses or function invocations on objects that could be null or undefined.

---

## 3. Technology Stack & Technical Constraints

| Component | Choice | Reason & Constraints |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v22.x LTS) | Event loop, asynchronous I/O fundamentals. |
| **Module System** | CommonJS (`require` / `module.exports`) | Simplicity in initial setup; avoid ESM tooling overhead. |
| **Web Framework** | Fastify | High-performance, plugin architecture, request lifecycle, schema-ready. |
| **Primary Database** | PostgreSQL | Relational integrity, ACID transactions, complex joins, constraints. |
| **DB Driver** | `pg` (node-postgres) | Raw SQL first to understand database connections, pooling, and query execution. No ORM. |
| **Cache Store** | Redis (`redis` client) | In-memory key-value store, cache invalidation strategies, TTL, session/temp data. |
| **Process Manager** | `nodemon` (dev) | Live reloading during development. |
| **Environment** | `dotenv` | 12-factor app config separation; `.env` for secrets, `.env.example` committed. |
| **Containerization**| Docker & Docker Compose | Container images, multi-container networking (API + Postgres + Redis), volumes. |
| **Deployment** | AWS EC2 (Linux VM) | Practical cloud fundamentals (SSH, security groups, reverse proxy, PM2/systemd). |

---

## 4. Verified Host Environment

- **OS:** Ubuntu Linux (ThinkPad laptop)
- **Node.js:** `v22.11.0`
- **npm:** `10.9.0`
- **Docker:** `29.1.3` (verified via `docker run hello-world`)
- **Docker Compose:** `2.40.3`
- **Redis:** `redis-cli ping` returns `PONG`
- **Git:** Installed
- **PostgreSQL:** Not yet confirmed running locally; will be spun up or verified in Stage 3.
- **Target Project Directory:** `~/Documents/projects/scfproducts`
- **Backend Directory:** `~/Documents/projects/scfproducts/server`

---

## 5. Architectural Directory Layout (Target)

```text
scfproducts/
├── context/                  # Overall project context & learning blueprint
│   └── context.md
├── server/                   # Backend application, container & cloud configs
│   ├── server-context/       # Dedicated backend, cloud & deployment documentation
│   │   └── backend-context.md
│   ├── src/
│   │   ├── config/           # Database pool, Redis client, env configs
│   │   ├── routes/           # Fastify routes & endpoints
│   │   ├── services/         # Business logic (orders, inventory, caching)
│   │   ├── repositories/     # Data access layer (PostgreSQL raw SQL)
│   │   └── server.js         # Fastify server bootstrap & lifecycle
│   ├── tests/                # Automated API endpoint & integration tests
│   ├── .env                  # Local secrets (never committed)
│   ├── .env.example          # Environment variable template
│   ├── .gitignore            # Git ignore rules
│   ├── Dockerfile            # Container definition
│   ├── compose.yaml          # Multi-container orchestration (API, Postgres, Redis)
│   ├── package.json
│   └── package-lock.json
└── [future] client/          # Frontend client application (Stage 10)
```

---

## 6. 10-Stage Learning Roadmap

- **Stage 1 — Fastify & HTTP Fundamentals:** Server instantiation, ports, event loop, JSON serialization, HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`), status codes, `/health` endpoint, `curl` testing, Fastify lifecycle hooks.
- **Stage 2 — Product CRUD (In-Memory first):** REST API design, resource naming, request validation, separating Routes from Services and Repositories using an in-memory array/map before database integration.
- **Stage 3 — PostgreSQL & Raw SQL:** Running Postgres (Docker or local), schema design (tables, PKs, FKs, constraints, indexes), `pg` connection pool, SQL queries, parameterized queries (SQL injection prevention), transactions (`BEGIN`/`COMMIT`/`ROLLBACK`).
- **Stage 4 — Orders & Inventory Management:** Multi-product line items, transactional stock decrement, preventing race conditions (optimistic/pessimistic locking, `SELECT FOR UPDATE`), order state transitions.
- **Stage 5 — Redis Caching:** Redis data structures, Cache-Aside pattern, Read-through caching for products, Cache Invalidation on updates/deletions, TTL, handling cache stampede.
- **Stage 6 — Security, Validation & Centralized Error Handling:** Fastify JSON schema validation (AJV), centralized error handler (`setErrorHandler`), authentication (JWT/cookies), password hashing (bcrypt/argon2), security headers.
- **Stage 7 — Docker & Docker Compose:** Building optimized Docker images, Docker networking, persistent named volumes for Postgres/Redis, environment injection, compose health checks.
- **Stage 8 — Cloud Deployment (AWS Linux VM):** EC2 instance setup, security groups/firewall, SSH keys, non-root user setup, Nginx reverse proxy, SSL/TLS with Let's Encrypt, cost monitoring & resource teardown.
- **Stage 9 — Git, GitHub & CI/CD:** Meaningful commit history, branch strategies, GitHub Actions CI workflow (linting, automated test runs on push/PR).
- **Stage 10 — Frontend / API Consumer:** Lightweight frontend or client dashboard to demonstrate real-world consumption of the SupplyHub API.

## 7. Current Progress Status

- **Active Stage:** Stage 10 — Frontend / API Consumer. The API the UI needs is written down in [`frontend-requirements.md`](frontend-requirements.md).
- **Completed:** Stages 1–6 for the running API: Fastify bootstrap, auth (JWT + bcrypt), outlets, categories, products with Redis cache, orders with stock locking, and one JSON error shape.
- **Still open:** Docker image for the API, AWS deploy, and the frontend itself. Follow `context/frontend-requirements.md` when building the UI. Do not invent fields. The server owns prices, tax (5%), and stock.
