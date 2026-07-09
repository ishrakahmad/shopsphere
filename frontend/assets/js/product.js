let currentProduct = null;
let selectedQty = 1;

document.addEventListener('DOMContentLoaded', async () => {
  const slug = qs('slug');
  const id = qs('id');
  const container = document.getElementById('productContainer');
  if (!slug && !id) {
    container.innerHTML = emptyState('Product not found', 'No product was specified.');
    return;
  }

  try {
    currentProduct = slug ? await api.get(`/products/slug/${slug}`, { auth: false }) : await api.get(`/products/${id}`, { auth: false });
    document.getElementById('pageTitle').textContent = `${currentProduct.name} — ShopSphere`;
    renderProduct(currentProduct);
    loadRelated(currentProduct.id);
  } catch (err) {
    container.innerHTML = emptyState('Product not found', err.message);
  }
});

function emptyState(title, msg) {
  return `<div class="empty-state"><div class="icon">📦</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(msg)}</p><a href="/shop.html" class="btn btn-primary">Back to shop</a></div>`;
}

function renderProduct(p) {
  const price = Number(p.discountPrice ?? p.price);
  const hasDiscount = p.discountPrice != null && Number(p.discountPrice) < Number(p.price);
  const outOfStock = p.stock <= 0;
  const images = p.images && p.images.length ? p.images : [null];

  document.getElementById('productContainer').innerHTML = `
    <div class="breadcrumb"><a href="/index.html">Home</a> / <a href="/shop.html?categoryId=${p.category?.id || ''}">${escapeHtml(p.category?.name || 'Shop')}</a> / ${escapeHtml(p.name)}</div>

    <div class="pd-layout">
      <div>
        <div class="pd-gallery-main" id="pdMainImg">${images[0] ? `<img src="${resolveImg(images[0])}" alt="${escapeHtml(p.name)}">` : productEmoji(p.category?.name)}</div>
        ${images.length > 1 ? `<div class="pd-thumbs">${images.map((img, i) => `
          <div class="pd-thumb ${i === 0 ? 'active' : ''}" data-img="${img ? resolveImg(img) : ''}">${img ? `<img src="${resolveImg(img)}">` : productEmoji(p.category?.name)}</div>
        `).join('')}</div>` : ''}
      </div>

      <div>
        <span class="product-cat">${escapeHtml(p.category?.name || '')}</span>
        <h1 style="font-size:1.9rem; margin:6px 0 10px;">${escapeHtml(p.name)}</h1>
        <div class="product-rating" style="font-size:14px; margin-bottom:14px;">
          <span class="stars">${starString(p.avgRating)}</span>
          <span>${Number(p.avgRating).toFixed(1)} · ${p.totalReviews} review${p.totalReviews === 1 ? '' : 's'}</span>
        </div>

        <div class="price price-lg">
          ${formatMoney(price)}
          ${hasDiscount ? `<span class="price-was">${formatMoney(p.price)}</span>` : ''}
        </div>

        <div class="pd-meta-row">
          <span>${outOfStock ? '🔴 Out of stock' : `🟢 ${p.stock} in stock`}</span>
          <span>SKU: ${escapeHtml(p.sku)}</span>
        </div>

        <p>${escapeHtml(p.description)}</p>

        <div class="pd-actions">
          <div class="qty-stepper">
            <button id="qtyMinus">−</button>
            <span id="qtyVal">1</span>
            <button id="qtyPlus">+</button>
          </div>
          <button id="addToCartBtn" class="btn btn-primary" style="flex:1;" ${outOfStock ? 'disabled' : ''}>
            ${outOfStock ? 'Out of stock' : 'Add to cart'}
          </button>
          <button id="wishlistToggleBtn" class="btn btn-outline btn-icon" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="reviews">Reviews (${p.totalReviews})</button>
    </div>
    <div id="reviewsPane">
      <div id="reviewFormWrap"></div>
      <div id="reviewList">${renderReviews(p.reviews)}</div>
    </div>

    <section class="section">
      <div class="section-head"><h2>You might also like</h2></div>
      <div id="relatedGrid" class="product-grid"><div class="skeleton" style="aspect-ratio:3/4;"></div></div>
    </section>
  `;

  wireGallery();
  wireActions(p);
  wireReviewForm(p);
}

function wireGallery() {
  document.querySelectorAll('.pd-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.pd-thumb').forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = thumb.dataset.img;
      const mainImg = document.getElementById('pdMainImg');
      mainImg.innerHTML = src ? `<img src="${src}">` : productEmoji(currentProduct.category?.name);
    });
  });
}

function wireActions(p) {
  document.getElementById('qtyMinus').addEventListener('click', () => {
    selectedQty = Math.max(1, selectedQty - 1);
    document.getElementById('qtyVal').textContent = selectedQty;
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    selectedQty = Math.min(p.stock, selectedQty + 1);
    document.getElementById('qtyVal').textContent = selectedQty;
  });
  document.getElementById('addToCartBtn').addEventListener('click', async () => {
    if (!requireAuth()) return;
    try {
      await api.post('/cart/items', { productId: p.id, quantity: selectedQty });
      toast('Added to cart', 'success');
      refreshCartBadge();
    } catch (err) { toast(err.message, 'error'); }
  });

  const wishBtn = document.getElementById('wishlistToggleBtn');
  if (isLoggedIn()) {
    api.get('/wishlist').then((list) => {
      if (list.some((w) => w.productId === p.id)) wishBtn.classList.add('active');
    }).catch(() => {});
  }
  wishBtn.addEventListener('click', async () => {
    if (!requireAuth()) return;
    try {
      if (wishBtn.classList.contains('active')) {
        await api.delete(`/wishlist/${p.id}`);
        wishBtn.classList.remove('active');
        toast('Removed from wishlist');
      } else {
        await api.post(`/wishlist/${p.id}`);
        wishBtn.classList.add('active');
        toast('Added to wishlist', 'success');
      }
      refreshWishlistBadge();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function renderReviews(reviews) {
  if (!reviews || reviews.length === 0) {
    return `<div class="empty-state"><div class="icon">💬</div><h3>No reviews yet</h3><p>Be the first to review this product after your order is delivered.</p></div>`;
  }
  return reviews.map((r) => `
    <div class="review-item">
      <div class="review-head">
        <div class="flex items-center gap-8">
          <div class="avatar-circle">${escapeHtml((r.user?.name || '?')[0].toUpperCase())}</div>
          <div>
            <div style="font-weight:600; font-size:13.5px;">${escapeHtml(r.user?.name || 'Anonymous')}</div>
            <div class="rating-stars" style="font-size:12px;">${starString(r.rating)}</div>
          </div>
        </div>
        <span class="text-faint text-sm">${timeAgo(r.createdAt)}</span>
      </div>
      ${r.comment ? `<p style="margin:8px 0 0;">${escapeHtml(r.comment)}</p>` : ''}
    </div>
  `).join('');
}

function wireReviewForm(p) {
  const wrap = document.getElementById('reviewFormWrap');
  if (!isLoggedIn()) {
    wrap.innerHTML = `<p class="text-sm text-soft"><a href="/login.html" style="color:var(--color-primary); font-weight:600;">Log in</a> to write a review.</p>`;
    return;
  }
  wrap.innerHTML = `
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-title">Write a review</div>
      <p class="text-sm text-soft" style="margin-bottom:14px;">You can review this product once it's in a delivered order.</p>
      <div class="field">
        <label>Your rating</label>
        <select id="reviewRating" style="max-width:160px;">
          <option value="5">★★★★★ Excellent</option>
          <option value="4">★★★★☆ Good</option>
          <option value="3">★★★☆☆ Average</option>
          <option value="2">★★☆☆☆ Poor</option>
          <option value="1">★☆☆☆☆ Terrible</option>
        </select>
      </div>
      <div class="field">
        <label>Comment (optional)</label>
        <textarea id="reviewComment" rows="3" placeholder="Share your experience with this product..."></textarea>
      </div>
      <button id="submitReviewBtn" class="btn btn-primary btn-sm">Submit review</button>
    </div>
  `;
  document.getElementById('submitReviewBtn').addEventListener('click', async () => {
    const rating = Number(document.getElementById('reviewRating').value);
    const comment = document.getElementById('reviewComment').value.trim();
    try {
      const reviews = await api.post(`/products/${p.id}/reviews`, { rating, comment: comment || undefined });
      toast('Review submitted', 'success');
      document.getElementById('reviewList').innerHTML = renderReviews(reviews);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

async function loadRelated(id) {
  const grid = document.getElementById('relatedGrid');
  try {
    const related = await api.get(`/products/${id}/related`, { auth: false });
    renderProductGrid(grid, related);
    wireProductGridEvents(grid);
    markWishlistedCards(grid);
  } catch {
    grid.innerHTML = '';
  }
}
