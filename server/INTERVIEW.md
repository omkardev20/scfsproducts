# SupplyHub interview notes

Read one section, then say the short answer out loud without looking. The longer part is so you understand the code. The short part is what you say in the interview.

Your last `docker compose up` already proved the happy path: Postgres was ready, Redis answered `PONG`, and the API listened on port 3000. The Redis "memory overcommit" line is a warning. The server still started.

## 1. What is this project?

**Understand:** SupplyHub is a backend for a food supplier. A supplier admin manages outlets, categories, products, and stock. An outlet manager from one shop orders products for that shop only. The API is Node.js and Fastify. Data is in PostgreSQL. The product list is cached in Redis. Docker starts all three together.

**Say this:** It is a B2B food-supply API. Admins manage the catalog, outlet managers order for their own shop, and orders, stock, and prices are handled on the server.

## 2. How is the code organized?

**Understand:** A request passes through three layers. Routes in `src/routes` check the JSON shape and call a service. Services in `src/services` hold the rules, such as who can order and what an order costs. Repositories in `src/repositories` run SQL. Routes do not write SQL.

**Say this:** Routes validate and call services. Services hold the business rules. Repositories run the SQL. That keeps HTTP and database code apart.

## 3. How do you validate a request?

**Understand:** There are two checks. Fastify's JSON Schema on the route rejects a bad body before your function runs, for example a password shorter than 8 characters on login. The service checks rules the schema cannot know, such as "this outlet id must exist" or "quantity must be a whole number." Failed requests return one shape: `{ error: { message, details } }`. A 500 hides the real message so SQL does not leak to the client.

**Say this:** JSON Schema on the route rejects the wrong shape. The service checks business rules. Every error uses the same JSON body, and 500s hide internal details.

## 4. How does login work?

**Understand:** `POST /api/auth/login` looks up the user by email and compares the password with `bcrypt.compare`. On success `issueSession` signs a JWT. The token holds `sub` (user id), email, role, outletId, and fullName. It expires in 8 hours. `GET /api/auth/me` reads that token. It does not query the database again. The password hash is never sent back.

**Say this:** Login checks the email and a bcrypt hash, then returns a JWT that expires in 8 hours. The token carries the user id, role, and outlet, and `/me` reads the token.

## 5. Why is the login error the same for a wrong email and a wrong password?

**Understand:** `authService.login` throws `Email or password is incorrect` in both cases. If a missing email said "user not found" and a bad password said "wrong password," someone could test which emails are registered.

**Say this:** Both failures return the same 401. That stops a caller from discovering which emails exist.

## 6. Why bcrypt, and what is the cost of 10?

**Understand:** Passwords are stored with `bcrypt.hash(password, 10)`. The database never keeps the plain password. The `10` is the cost factor. Each step makes guessing slower. Login uses `bcrypt.compare`, which checks the password against that hash.

**Say this:** I store a bcrypt hash, not the password. Cost 10 slows brute-force guesses, and login uses `bcrypt.compare`.

## 7. What is a JWT, and what happens if `JWT_SECRET` is missing?

**Understand:** A JWT is a signed string. The server signs it with `JWT_SECRET`. Later `authenticate` calls `jwtVerify`. If the signature is wrong or the token is expired, the route returns 401. `registerAuth` throws on startup when `JWT_SECRET` is missing, so the API cannot boot with an empty secret. In Docker that secret comes from `compose.yaml`, not from a `.env` file inside the image. Your log said `injected env (0) from .env`, which means the file was not in the container and Compose supplied the variables.

**Say this:** The JWT is signed with a secret and checked on protected routes. The process refuses to start if `JWT_SECRET` is missing. In Docker, Compose injects that variable.

## 8. How do roles work?

**Understand:** There are two roles, stored on the user and copied into the token. `SUPPLIER_ADMIN` manages the catalog and every outlet. `OUTLET_MANAGER` must belong to one outlet, and an admin must not be tied to one outlet. `requireRole` runs after `authenticate`. A missing or bad token is 401. A valid token with the wrong role is 403.

**Say this:** Admins manage the whole catalog. Outlet managers are limited to one outlet. A bad token is 401. A logged-in user without permission is 403.

## 9. How do you stop a manager from ordering for another shop?

**Understand:** In `orderService.create`, if the role is `OUTLET_MANAGER`, the outlet id is taken from the token, not from the body. If the body sends a different outlet id, the service returns 403. Listing orders does the same: a manager's query is forced to their own `outletId`.

**Say this:** The manager's outlet comes from the JWT. A body that names another outlet is rejected with 403.

## 10. What is a transaction, and where do you use one?

**Understand:** `withTransaction` in `src/lib/sql.js` runs `BEGIN`, then your queries, then `COMMIT`. If any query throws, it runs `ROLLBACK`. Creating an order inserts the order, inserts each line, decreases stock, and writes an inventory log. Those must all succeed or all disappear. Otherwise you could have an order with no stock change.

**Say this:** An order, its lines, the stock update, and the inventory log run in one transaction. A failure rolls all of them back.

## 11. Why `SELECT ... FOR UPDATE`?

**Understand:** Two managers can order the last 5 units at the same time. Both would read stock 5 and both would subtract. `FOR UPDATE` locks those product rows until the transaction ends, so the second order waits, then sees the new stock. Product ids are sorted before the lock so two orders lock rows in the same order and do not deadlock. You only need this sentence if they ask about two orders at once. The lock is in `orderService.js`.

**Say this:** `SELECT ... FOR UPDATE` locks the product rows inside the order transaction so two orders cannot sell the last units at the same time. Ids are sorted first to avoid a deadlock.

## 12. Why doesn't the client send the price?

**Understand:** `prepareItems` accepts product id and quantity only. Inside the transaction the service reads `products.price` and computes the line subtotal. Tax is 5 percent in `orderRules.summarize`. A client cannot post a cheaper price.

**Say this:** The client sends product ids and quantities. The server reads the catalog price and adds 5 percent tax, so the client cannot choose the price.

## 13. When does cancelling an order put stock back?

**Understand:** Status can only move along a fixed path: pending to confirmed or cancelled, confirmed to in_transit or cancelled, in_transit to delivered. Delivered and cancelled stop. Stock goes back only when a pending or confirmed order is cancelled. An in-transit order cannot be cancelled, because it has already left. The cancel writes an inventory log with reason `cancel:<orderId>`. A manager may only cancel. Status changes such as "confirmed" are admin-only.

**Say this:** Stock is restored only if a pending or confirmed order is cancelled. Once it is in transit, it cannot be cancelled. Managers can cancel. Admins move the other statuses.

## 14. How does Redis caching work here?

**Understand:** This is cache-aside in `src/services/cache.js`. On a read, the service looks in Redis first. On a miss, it reads PostgreSQL and stores the JSON in Redis for 60 seconds. Only the default product list is cached: limit 50, offset 0, no search, active products only. Search and other pages always hit Postgres. After a product or stock change, `invalidateProducts` deletes the list key and that product's key. The delete happens after the transaction commits, so a rolled-back order does not clear a good cache. If Redis throws, the read returns null and the API uses PostgreSQL. A cache failure does not fail the request.

**Say this:** The default product list is cache-aside in Redis with a 60-second TTL. Writes delete those keys after commit. If Redis is down, the API reads PostgreSQL.

## 15. What does `/health` check?

**Understand:** `GET /health` needs no token. It runs `SELECT 1` and `PING` on Redis. Both up returns 200. Either one down returns 503 with `postgres` and `redis` marked connected or disconnected. Your running containers logged both as connected, which is why the health URL is the right thing to open.

**Say this:** `/health` runs a real Postgres query and a Redis ping. Both up is 200. Either down is 503.

## 16. What do your tests cover?

**Understand:** `npm test` uses Node's built-in test runner. `tests/orderRules.test.js` checks tax rounding, legal status changes, merging duplicate products, and an empty order. `tests/slug.test.js` checks slug text. These functions do not touch the database, so the tests do not need Postgres. They do not cover HTTP or the row lock. If asked, say that plainly.

**Say this:** Node's test runner covers order math, status rules, and slugs, with no database. HTTP and the stock lock are not in those tests.

## 17. Why pagination limits?

**Understand:** `readPage` turns `?limit=&offset=` into numbers. A missing limit becomes 50. The limit is clamped between 1 and 100. Offset cannot be negative. That stops one request from asking for the whole table.

**Say this:** List endpoints use limit and offset. Limit defaults to 50 and cannot go above 100.

## 18. Why parameterized SQL?

**Understand:** Queries use `$1`, `$2`, and a separate values array. The value is data, not part of the SQL string. That blocks a user from ending the query early and adding their own SQL.

**Say this:** Values go in as `$1` parameters, not pasted into the SQL string, so user input cannot change the query.

## 19. What did Docker change in this project?

**Understand:** Docker does not change the order rules. `Dockerfile` packs the API: start from `node:22-alpine`, install dependencies, copy the code, run `npm start`. `compose.yaml` starts three containers on one network: `api`, `postgres`, and `redis`. Inside the API container, `localhost` is the API itself, so `DB_HOST` is `postgres` and `REDIS_HOST` is `redis`. Compose waits until Postgres and Redis healthchecks pass, then starts the API. Dependencies are copied before the source so a code change does not reinstall npm packages. `.env` is not copied into the image.

**Say this:** Docker Compose runs the API, Postgres, and Redis. The API reaches the database by the hostname `postgres`, because `localhost` inside the container is the API itself.

## 20. Why did port 6379 fail the first time?

**Understand:** The first compose file published Redis on the laptop's port 6379 and Postgres on 5432. This laptop already had Redis and Postgres there, so Docker could not bind 6379. The API container does not need those host ports. It talks to the other containers by name. Only port 3000 is published, which is the API. The second `up` worked: Redis logged "Ready to accept connections," Postgres logged "ready to accept connections," and the API logged a Redis `PONG`.

**Say this:** The laptop already used 6379 and 5432, so those ports are not published. The containers still talk to each other by name, and only port 3000 is opened for the API.

## What to open while you practice

| Question | File |
| --- | --- |
| Login and bcrypt | `src/services/authService.js` |
| JWT and roles | `src/bootstrap/auth.js` |
| Manager cannot switch outlet | `src/services/orderService.js` |
| Transaction | `src/lib/sql.js` |
| Price, tax, status | `src/services/orderRules.js` |
| Redis | `src/services/cache.js` and `src/services/productService.js` |
| Tests | `tests/orderRules.test.js` |
| Docker | `Dockerfile` and `compose.yaml` |

Swagger for the running API is `http://localhost:3000/docs`. Health is `http://localhost:3000/health`.
