# ShopSphere Frontend

Plain HTML / CSS / JavaScript storefront + admin panel — no build step required.

## Run it

The backend's CORS is locked to `http://localhost:3000` by default (see `backend/.env`), so serve this
folder on port **3000** with any static file server. From this `frontend/` folder:

```bash
# Option A — Node's `serve` package
npx serve -l 3000 .

# Option B — Python
python3 -m http.server 3000

# Option C — VS Code "Live Server" extension, set to port 3000
```

Then open **http://localhost:3000/index.html**

> Opening the HTML files directly by double-clicking (`file://...`) will NOT work — the browser
> blocks the API requests due to CORS. Always serve over `http://localhost:3000`.

## Backend connection
Edit `assets/js/config.js` if your backend isn't running on the default `http://localhost:5000/api/v1`
(e.g. you had to use port 5001):
```js
window.SHOPSPHERE_CONFIG = { API_BASE_URL: 'http://localhost:5001/api/v1' };
```
If you change the frontend's port away from 3000, also update `FRONTEND_URL` in `backend/.env` to match,
then restart the backend.

## Pages
```
index.html            Home — hero, categories, featured/new/bestseller/flash-sale
shop.html              Product listing — search, filters, sort, pagination
product.html           Product detail — gallery, reviews, related products
cart.html               Cart — quantity, save-for-later, coupon, totals
wishlist.html            Wishlist
checkout.html            Address selection + place order (COD)
orders.html               Order history
order-detail.html          Invoice / order detail + cancel
account.html                Profile + address book
login.html / register.html / forgot-password.html / reset-password.html

admin/index.html        Dashboard — KPIs, revenue chart, top products, low stock
admin/products.html      Product CRUD + image upload
admin/categories.html    Category CRUD
admin/orders.html         Order status management
admin/customers.html      Customer list, edit, ban/unban
```

## Notes
- Auth token + user info are stored in `localStorage` (`ss_token`, `ss_user`).
- Dark mode toggle persists via `localStorage` (`ss_theme`).
- Admin pages self-guard with `requireAdmin()` — non-admins get redirected to `/login.html`.
- Coupons for testing: `SAVE10`, `SAVE20`, `FLAT5` (see `backend/src/common/utils/coupon.ts`).
