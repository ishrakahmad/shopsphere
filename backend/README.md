# ShopSphere Backend

NestJS + PostgreSQL + Prisma REST API for the ShopSphere e-commerce platform.

## Stack
- **NestJS** — modular backend framework
- **PostgreSQL** + **Prisma ORM**
- **JWT** auth (Bearer token) + **bcrypt** password hashing
- **Multer** — product image uploads
- **Swagger** — auto-generated API docs

## Setup

```bash
cd backend
npm install

# Copy env and fill in your PostgreSQL connection string, JWT secret, mail SMTP creds
cp .env.example .env

# Create the database schema
npx prisma migrate dev --name init

# Seed an admin user, a demo customer, and sample products/categories
npx prisma db seed

# Start the dev server (with hot reload)
npm run start:dev
```

The API runs at `http://localhost:5000/api/v1`
Swagger docs: `http://localhost:5000/api/docs`

## Seeded accounts
| Role     | Email                    | Password       |
|----------|---------------------------|----------------|
| Admin    | admin@shopsphere.com      | Admin@123      |
| Customer | customer@shopsphere.com   | Customer@123   |

## Project structure
```
src/
  auth/          Register, Login, Forgot/Reset Password, JWT strategy
  users/         Profile update, admin customer management (list/ban/edit)
  categories/    Category CRUD
  products/      Product CRUD, search/filter/sort, image upload, related products
  cart/          Add/remove/update items, save-for-later, coupon, totals
  wishlist/      Add/remove wishlist items
  addresses/     Billing/shipping address book
  orders/        Checkout, order history, invoice data, admin status updates
  reviews/       Verified-purchase product reviews + rating aggregation
  admin/         Dashboard metrics, monthly sales, top products, low stock
  common/        Guards, decorators, filters, DTOs, multer config, utils
  prisma/        PrismaService (DB client)
  mail/          Nodemailer service for password reset emails
```

## Auth model
- All routes require a JWT **by default** (global guard). Add `@Public()` to a route to make it open.
- Admin-only routes are protected with `@Roles(Role.ADMIN)` + `RolesGuard`.
- Send the token as `Authorization: Bearer <token>`.

## Notes
- **Coupons** are currently hardcoded in `src/common/utils/coupon.ts` (`SAVE10`, `SAVE20`, `FLAT5`) for the MVP. Move this to a `coupons` table + admin CRUD when you need dynamic codes.
- **Payment**: Cash on Delivery (COD) only for now. The `Payment` model and `PaymentMethod` enum are already built so Card/Mobile Banking (Stripe, SSLCommerz, bKash, etc.) can be added later without a schema change.
- Product images are stored on disk under `uploads/products` and served at `/uploads/products/<file>`. Swap the storage engine for S3/Cloudinary in `common/config/multer.config.ts` when you move to production.
