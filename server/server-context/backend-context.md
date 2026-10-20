# SupplyHub Backend & Cloud Infrastructure Context

## 1. Backend Scope & Responsibilities

This directory (`scfproducts/server/`) contains the complete backend service, data layer, caching infrastructure, container configuration, and cloud deployment pipelines for **SupplyHub**.

### Key Backend Responsibilities
- **API Engine:** Fastify HTTP server handling JSON payloads, route matching, request/response lifecycle, and error formatting.
- **Data Persistence:** PostgreSQL relational database accessed via the `pg` driver using raw parameterized SQL.
- **In-Memory Caching:** Redis for read caching of products, reducing database query load, with explicit cache invalidation.
- **Business Logic & Validation:** Product inventory management, multi-item order calculations, stock reservation, and atomic status transitions.
- **Reliability:** Health checks (`/health`), structured JSON logging, and automated integration tests.

---

## 2. Directory Structure (`server/`)

```text
server/
├── server-context/       # Backend-specific documentation, cloud, and deployment architecture
│   └── backend-context.md
├── src/
│   ├── config/           # Database pool, Redis client, and environment configurations
│   ├── routes/           # Fastify routes (endpoints, parameter parsing, HTTP status codes)
│   ├── services/         # Business logic (order calculations, inventory checks, cache logic)
│   ├── repositories/     # Data access layer (PostgreSQL raw queries using pg pool)
│   └── server.js         # Entry point: Fastify instance, plugins, hooks, port binding
├── tests/                # Automated API endpoint & integration tests
├── .env                  # Local secret configuration (ignored by Git)
├── .env.example          # Safe template for required environment variables
├── .gitignore            # Git exclusions (node_modules, .env, logs)
├── Dockerfile            # Container definition for the backend Node.js application
└── compose.yaml          # Multi-container orchestration (API + PostgreSQL + Redis)
```

---

## 3. Cloud Architecture & Deployment Strategy

### Target Environment
- **Provider:** AWS (Amazon Web Services)
- **Compute:** EC2 Linux Virtual Machine (Ubuntu LTS, t3/t4g micro/small for cost awareness)
- **Access & Security:**
  - SSH key-pair authentication.
  - Security Groups: Restrict inbound ports (SSH: 22 restricted to admin IP, HTTP: 80, HTTPS: 443; database/redis ports NEVER exposed publicly).
- **Process Management & Reverse Proxy:**
  - Nginx as reverse proxy terminating SSL/TLS and forwarding traffic to port `3000`.
  - Process management via Docker containers or PM2/systemd service unit with auto-restart on failure.
- **Environment & Secrets:**
  - Injected securely via production `.env` or AWS Parameter Store/Secrets Manager.
  - No secrets or credentials committed to Git.

---

## 4. Instructions for Future AI Agents Working in `server/`

1. **Working Directory:** All backend commands (`npm`, `node`, `docker`, test scripts) must be executed inside `~/Documents/projects/scfproducts/server`.
2. **Teaching Mode:** The user writes all code and executes commands manually. Explain line-by-line, provide exact commands, explain flags, provide test commands (`curl`), and wait for terminal outputs.
3. **No Premature Abstractions:** Keep it lean — CommonJS, Fastify, `pg`, Redis, and raw SQL. Do NOT add ORMs or TypeScript unless explicitly instructed.
4. **Clean Boundaries:** Routes call Services; Services call Repositories; Repositories query PostgreSQL. Services interact with Redis. Routes never run raw SQL queries directly.
5. **Defensive Coding & Null Safety:** Mandatory use of optional chaining (`?.`), nullish coalescing (`??`), and defensive null/undefined checks across all configurations, routes, services, repositories, and error handlers to guarantee zero runtime null-dereference crashes.
