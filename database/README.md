# ShopSphere Database

PostgreSQL schema, managed via **Prisma ORM**. Source of truth: `backend/prisma/schema.prisma`.

## Tables & relationships

| Table         | Key relationships |
|---------------|--------------------|
| `users`       | 1—1 `cart`, 1—N `addresses`, `wishlist`, `orders`, `reviews`, `products` (as creator) |
| `categories`  | 1—N `products` |
| `products`    | N—1 `categories`, N—1 `users` (createdBy), 1—N `cart_items`, `wishlist`, `order_items`, `reviews` |
| `cart`        | 1—1 `users`, 1—N `cart_items` |
| `cart_items`  | N—1 `cart`, N—1 `products` (unique on `cartId, productId`) |
| `wishlist`    | N—1 `users`, N—1 `products` (unique on `userId, productId`) |
| `addresses`   | N—1 `users`; referenced by `orders` as billing/shipping |
| `orders`      | N—1 `users`, N—1 `addresses` (x2: billing & shipping), 1—N `order_items`, 1—1 `payments` |
| `order_items` | N—1 `orders`, N—1 `products` (price/name snapshotted at order time) |
| `payments`    | 1—1 `orders` |
| `reviews`     | N—1 `users`, N—1 `products` (unique on `userId, productId`) |

## Enums
- `Role`: ADMIN, CUSTOMER
- `OrderStatus`: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- `PaymentMethod`: COD, CARD, MOBILE_BANKING
- `PaymentStatus`: PENDING, PAID, FAILED, REFUNDED
- `AddressType`: BILLING, SHIPPING

## Commands (run inside `backend/`)

```bash
npx prisma migrate dev --name init   # create tables
npx prisma studio                    # visual DB browser
npx prisma db seed                   # load sample data
```
