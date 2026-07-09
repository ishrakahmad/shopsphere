// Renders a product card and wires up add-to-cart / wishlist buttons via
// event delegation, so any grid using `.product-grid` gets this for free.

function productCardHtml(p) {
  const price = Number(p.discountPrice ?? p.price);
  const hasDiscount = p.discountPrice != null && Number(p.discountPrice) < Number(p.price);
  const outOfStock = p.stock <= 0;
  const img = p.images && p.images[0] ? `<img src="${resolveImg(p.images[0])}" alt="${escapeHtml(p.name)}" loading="lazy">` : productEmoji(p.category?.name);

  let badge = '';
  if (outOfStock) badge = '<span class="tag tag-out">Out of stock</span>';
  else if (p.isFlashSale) badge = '<span class="tag tag-sale">Flash sale</span>';
  else if (p.isNewArrival) badge = '<span class="tag tag-new">New</span>';
  else if (p.isBestSeller) badge = '<span class="tag tag-best">Bestseller</span>';

  return `
    <div class="product-card" data-id="${p.id}">
      <a href="/product.html?slug=${p.slug}" class="product-thumb">
        ${badge ? `<div class="product-badges">${badge}</div>` : ''}
        ${img}
      </a>
      <button class="wishlist-btn" data-action="wishlist" data-id="${p.id}" aria-label="Add to wishlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
      </button>
      <div class="product-body">
        <span class="product-cat">${escapeHtml(p.category?.name || '')}</span>
        <a href="/product.html?slug=${p.slug}" class="product-name">${escapeHtml(p.name)}</a>
        <div class="product-rating"><span class="stars">${starString(p.avgRating)}</span><span>(${p.totalReviews || 0})</span></div>
        <div class="product-bottom">
          <span class="price price-now">${formatMoney(price)}${hasDiscount ? `<span class="price-was">${formatMoney(p.price)}</span>` : ''}</span>
          <button class="add-cart-btn" data-action="add-cart" data-id="${p.id}" ${outOfStock ? 'disabled' : ''} aria-label="Add to cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function resolveImg(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return API_BASE.replace('/api/v1', '') + path;
}

function renderProductGrid(container, products) {
  if (!container) return;
  if (!products || products.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">📦</div><h3>No products found</h3><p>Try a different search or filter.</p></div>`;
    return;
  }
  container.innerHTML = products.map(productCardHtml).join('');
}

// Event delegation: attach once per container
function wireProductGridEvents(container) {
  if (!container || container.dataset.wired) return;
  container.dataset.wired = 'true';

  container.addEventListener('click', async (e) => {
    const wishBtn = e.target.closest('[data-action="wishlist"]');
    const cartBtn = e.target.closest('[data-action="add-cart"]');

    if (wishBtn) {
      e.preventDefault();
      if (!requireAuth()) return;
      const id = wishBtn.dataset.id;
      try {
        if (wishBtn.classList.contains('active')) {
          await api.delete(`/wishlist/${id}`);
          wishBtn.classList.remove('active');
          toast('Removed from wishlist');
        } else {
          await api.post(`/wishlist/${id}`);
          wishBtn.classList.add('active');
          toast('Added to wishlist', 'success');
        }
        refreshWishlistBadge();
      } catch (err) {
        toast(err.message, 'error');
      }
    }

    if (cartBtn && !cartBtn.disabled) {
      e.preventDefault();
      if (!requireAuth()) return;
      const id = cartBtn.dataset.id;
      cartBtn.disabled = true;
      try {
        await api.post('/cart/items', { productId: id, quantity: 1 });
        toast('Added to cart', 'success');
        refreshCartBadge();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        cartBtn.disabled = false;
      }
    }
  });
}

// Marks wishlist hearts as active based on the user's current wishlist
async function markWishlistedCards(container) {
  if (!isLoggedIn() || !container) return;
  try {
    const list = await api.get('/wishlist');
    const ids = new Set(list.map((w) => w.productId));
    container.querySelectorAll('[data-action="wishlist"]').forEach((btn) => {
      if (ids.has(btn.dataset.id)) btn.classList.add('active');
    });
  } catch { /* silent */ }
}
