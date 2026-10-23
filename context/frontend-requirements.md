# SupplyHub frontend contract

This is what a future frontend needs from the backend. The UI does not exist yet. Build it against this document, not against guesses.

Base URL in development: `http://localhost:3000`

Interactive docs (same routes): `http://localhost:3000/docs`

## How every response looks

Success with one record:

```json
{ "data": {} }
```

Success with a list:

```json
{
  "data": [],
  "meta": { "limit": 50, "offset": 0, "total": 0 }
}
```

`total` is the full count, not the page size. Ask for the next page with `?limit=50&offset=50`. `limit` max is 100.

Failure, including validation errors:

```json
{
  "error": {
    "message": "Human readable sentence",
    "details": null
  }
}
```

On a validation failure, `details` is an array of field errors. On a 500, `message` is always `Internal server error`.

Show `error.message` in the UI. Send the user back to the login screen on **401**.

## Login token

Signup and login both return:

```json
{
  "data": {
    "token": "jwt",
    "user": {
      "id": "uuid",
      "outletId": "uuid or null",
      "email": "manager@outlet.com",
      "fullName": "Asha Rao",
      "role": "OUTLET_MANAGER",
      "createdAt": "2026-10-23T12:00:00.000Z"
    }
  }
}
```

Store `token`. Send it on every other `/api` call:

```http
Authorization: Bearer <token>
```

The token lasts **8 hours**. There is no refresh token. After that, `GET /api/auth/me` returns 401 and the UI should log in again.

`/health` does not use the token.

## Roles

| Role | Who | What the UI allows |
|---|---|---|
| `SUPPLIER_ADMIN` | Supplier staff. `outletId` is null. | Outlets, categories, products, stock adjustments, every order, every status change. |
| `OUTLET_MANAGER` | One restaurant branch. `outletId` is set. | See their outlet, the active catalog, and their orders. Place an order. Cancel it while it is `pending` or `confirmed`. |

Hide admin buttons when `user.role !== "SUPPLIER_ADMIN"`. The API also rejects those calls with **403**.

## Screens to build later

1. **Login / signup.** Signup needs an outlet id before an outlet manager can be created, so create the outlet as an admin first.
2. **Outlet list and form.** Admin only for create and edit.
3. **Category list and form.** Admin only for create, edit, and delete.
4. **Product catalog.** Search box, paging, price, unit, stock. Admin form for create and edit. Delete hides the product. It does not erase it.
5. **Stock adjustment.** Admin only. A number (positive or negative) and a reason.
6. **New order.** Pick products and quantities. Do not send prices. Show the returned subtotal, tax, and total.
7. **Order list and detail.** Filter by status. Detail shows line items. Admin moves status forward. Manager sees a Cancel button only before the order ships.

## Health

`GET /health`

No token. **200** when both are up, **503** when one is down.

```json
{
  "status": "healthy",
  "message": "SupplyHub API is running",
  "services": { "postgres": "connected", "redis": "connected" },
  "timestamp": "2026-10-23T12:00:00.000Z"
}
```

`status` is `degraded` when a service is down. `services.postgres` and `services.redis` are `connected` or `disconnected`.

## Auth

### `POST /api/auth/signup`

No token. **201**.

```json
{
  "email": "admin@supplyhub.test",
  "password": "at least 8 characters",
  "fullName": "Omkar",
  "role": "SUPPLIER_ADMIN",
  "outletId": null
}
```

`OUTLET_MANAGER` must send `outletId`. `SUPPLIER_ADMIN` must omit it or send null.

### `POST /api/auth/login`

No token. **200**. Body: `{ "email", "password" }`. Same `data.token` and `data.user` shape as signup.

Wrong email or password is **401** with message `Email or password is incorrect`.

### `GET /api/auth/me`

Token required. Use this on app load to restore the session.

```json
{
  "data": {
    "id": "uuid",
    "email": "admin@supplyhub.test",
    "fullName": "Omkar",
    "role": "SUPPLIER_ADMIN",
    "outletId": null
  }
}
```

## Outlets

Token required.

| Method | Path | Who | Body |
|---|---|---|---|
| GET | `/api/outlets?limit&offset` | Both. Manager receives only their outlet. | |
| POST | `/api/outlets` | Admin | `{ "name", "branchCode", "address", "phone" }` |
| GET | `/api/outlets/:id` | Admin, or the manager of that outlet | |
| PATCH | `/api/outlets/:id` | Admin | Any of `name`, `branchCode`, `address`, `phone` |

Outlet object:

```json
{
  "id": "uuid",
  "name": "MG Road",
  "branchCode": "BLR-01",
  "address": "MG Road",
  "phone": "9800000000",
  "createdAt": "2026-10-23T12:00:00.000Z"
}
```

`branchCode` is unique. A duplicate is **409**.

## Categories

Token required. Category ids are numbers, not UUIDs.

| Method | Path | Who | Body |
|---|---|---|---|
| GET | `/api/categories?limit&offset` | Both | |
| POST | `/api/categories` | Admin | `{ "name", "slug"? }` |
| GET | `/api/categories/:id` | Both | |
| PATCH | `/api/categories/:id` | Admin | `{ "name"?, "slug"? }` |
| DELETE | `/api/categories/:id` | Admin | |

If `slug` is omitted it is built from the name (`Burger Buns` becomes `burger-buns`). Deleting a category keeps the products and clears their category.

```json
{ "id": 1, "name": "Buns", "slug": "buns" }
```

## Products

Token required. Money is a number of rupees with 2 decimals, not a string. Stock is an integer.

| Method | Path | Who |
|---|---|---|
| GET | `/api/products?limit&offset&search&includeInactive` | Both. `includeInactive=true` works for admins only. |
| POST | `/api/products` | Admin |
| GET | `/api/products/:id` | Both. Inactive products look like **404** to a manager. |
| PATCH | `/api/products/:id` | Admin. Do not send `currentStock`. |
| DELETE | `/api/products/:id` | Admin. Sets `isActive` to false. |

Create body:

```json
{
  "categoryId": 1,
  "sku": "BUN-001",
  "name": "Sesame Bun",
  "description": "Pack of 6",
  "price": 12.5,
  "currentStock": 40,
  "unit": "pack",
  "isActive": true
}
```

`sku`, `name`, and `price` are required. `categoryId` may be null. `sku` is unique.

Product object:

```json
{
  "id": "uuid",
  "categoryId": 1,
  "sku": "BUN-001",
  "name": "Sesame Bun",
  "description": "Pack of 6",
  "price": 12.5,
  "currentStock": 40,
  "unit": "pack",
  "isActive": true,
  "createdAt": "2026-10-23T12:00:00.000Z"
}
```

The default list (`limit=50`, `offset=0`, no search, active only) may be cached for 60 seconds. After a product or stock change the cache is cleared.

Change stock with the inventory endpoint, not with PATCH.

## Inventory

Admin token only.

### `GET /api/inventory/logs?productId&limit&offset`

```json
{
  "id": "uuid",
  "productId": "uuid",
  "sku": "BUN-001",
  "productName": "Sesame Bun",
  "changeQuantity": -2,
  "reason": "order:<orderId>",
  "createdAt": "2026-10-23T12:00:00.000Z"
}
```

`changeQuantity` is negative when stock leaves and positive when stock arrives.

### `POST /api/inventory/adjust`

**201**.

```json
{ "productId": "uuid", "changeQuantity": 10, "reason": "Morning delivery" }
```

`changeQuantity` cannot be 0. The API returns **409** if the result would be negative.

## Orders

Token required. Do not send prices or tax. The server copies the catalog price and adds **5% tax**.

### `GET /api/orders?limit&offset&status&outletId`

Managers only see their outlet. `outletId` is an admin filter. List items have `"items": []`. Load the detail route for lines.

### `POST /api/orders`

**201**. Admins must send `outletId`. Managers may omit it. Their outlet is taken from the token.

```json
{
  "outletId": "uuid",
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ]
}
```

Not enough stock is **409**. An inactive product is **400**. Duplicate product ids in `items` are added together.

### `GET /api/orders/:id`

```json
{
  "id": "uuid",
  "outletId": "uuid",
  "outletName": "MG Road",
  "branchCode": "BLR-01",
  "createdBy": "uuid",
  "status": "pending",
  "subtotal": 25,
  "taxAmount": 1.25,
  "totalAmount": 26.25,
  "createdAt": "2026-10-23T12:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "sku": "BUN-001",
      "name": "Sesame Bun",
      "unit": "pack",
      "quantity": 2,
      "unitPrice": 12.5,
      "subtotal": 25
    }
  ]
}
```

### `PATCH /api/orders/:id/status`

```json
{ "status": "confirmed" }
```

Allowed moves:

```text
pending -> confirmed -> in_transit -> delivered
pending -> cancelled
confirmed -> cancelled
```

`delivered` and `cancelled` are final. Cancelling `pending` or `confirmed` puts the stock back. An outlet manager may only send `cancelled`, and only for their own order. Other moves are admin only. An illegal move is **400**.

## First data to create

1. `POST /api/auth/signup` as `SUPPLIER_ADMIN`.
2. `POST /api/outlets`.
3. `POST /api/categories`, then `POST /api/products`.
4. `POST /api/auth/signup` as `OUTLET_MANAGER` with that `outletId`.
5. Log in as the manager and `POST /api/orders`.

Run `npm run migrate` inside `server/` once, before the first signup, so the tables exist.
