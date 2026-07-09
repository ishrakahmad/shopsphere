# 🛒 ShopSphere

A modern full-stack e-commerce platform.

## Structure
```
ShopSphere/
  backend/     NestJS + PostgreSQL + Prisma REST API
  frontend/    HTML / CSS / JavaScript storefront + admin panel (coming next)
  database/    Schema documentation
  README.md
```

## Status
- ✅ **Backend** — Auth (JWT, roles), Products, Categories, Cart, Wishlist, Addresses,
  Orders/Checkout (COD), Reviews (verified purchase), Admin dashboard & analytics.
  See [`backend/README.md`](./backend/README.md) to run it.
- ⏭️ **Frontend** — not started yet.

## Quick start (backend)
```bash
cd backend
npm install
cp .env.example .env      # fill in your PostgreSQL URL + JWT secret
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```
API: `http://localhost:5000/api/v1` · Docs: `http://localhost:5000/api/docs`
