document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadCart();
});

async function loadCart() {
  const root = document.getElementById('cartRoot');
  try {
    const cart = await api.get('/cart');
    renderCart(cart);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Could not load your cart</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderCart(cart) {
  const root = document.getElementById('cartRoot');

  if (cart.items.length === 0 && cart.savedForLater.length === 0) {
    root.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><h3>Your cart is empty</h3><p>Looks like you haven't added anything yet.</p><a href="/shop.html" class="btn btn-primary">Start shopping</a></div>`;
    return;
  }

  root.innerHTML = `
    <div class="cart-layout" style="margin-top:20px;">
      <div>
        <div class="panel">
          ${cart.items.length === 0
            ? `<div class="empty-state" style="padding:30px;"><div class="icon">🛒</div><h3>No items in cart</h3><p>Check your saved items below, or continue shopping.</p></div>`
            : cart.items.map(cartLineHtml).join('')}
        </div>

        ${cart.savedForLater.length > 0 ? `
          <div class="panel" style="margin-top:22px;">
            <div class="panel-title">Saved for later (${cart.savedForLater.length})</div>
            ${cart.savedForLater.map(savedLineHtml).join('')}
          </div>
        ` : ''}
      </div>

      <div class="panel">
        <div class="panel-title">Order summary</div>
        <div class="coupon-row">
          <input type="text" id="couponInput" placeholder="Coupon code" value="${cart.couponCode ? escapeHtml(cart.couponCode) : ''}">
          <button class="btn btn-outline btn-sm" id="couponBtn">${cart.couponCode ? 'Remove' : 'Apply'}</button>
        </div>
        ${cart.couponMessage ? `<div class="field-error" style="margin-bottom:10px;">${escapeHtml(cart.couponMessage)}</div>` : ''}

        <div class="summary-row"><span>Subtotal</span><span class="price">${formatMoney(cart.subtotal)}</span></div>
        <div class="summary-row"><span>Discount</span><span class="price">−${formatMoney(cart.discount)}</span></div>
        <div class="summary-row"><span>Shipping</span><span class="price">${cart.shipping === 0 ? 'FREE' : formatMoney(cart.shipping)}</span></div>
        ${cart.shipping > 0 ? `<div class="text-sm text-faint" style="margin-bottom:6px;">Free shipping on orders over ${formatMoney(cart.freeShippingThreshold)}</div>` : ''}
        <div class="summary-row total"><span>Total</span><span class="price">${formatMoney(cart.total)}</span></div>

        <a href="/checkout.html" class="btn btn-primary btn-block" style="margin-top:16px;" ${cart.items.length === 0 ? 'aria-disabled="true" onclick="return false;"' : ''}>
          Proceed to checkout →
        </a>
        <a href="/shop.html" class="btn btn-ghost btn-block" style="margin-top:8px;">Continue shopping</a>
      </div>
    </div>
  `;

  wireCartEvents();
}

function cartLineHtml(item) {
  const p = item.product;
  const price = Number(p.discountPrice ?? p.price);
  const img = p.images && p.images[0] ? `<img src="${resolveImg(p.images[0])}">` : `<div class="cart-thumb-fallback">${productEmoji(p.category?.name)}</div>`;
  return `
    <div class="cart-line" data-item="${item.id}">
      ${img}
      <div>
        <a href="/product.html?slug=${p.slug}" style="font-weight:600; font-size:14px;">${escapeHtml(p.name)}</a>
        <div class="price price-now" style="display:block; margin-top:4px;">${formatMoney(price)}</div>
        <button class="btn btn-ghost btn-sm" style="padding:4px 0; color:var(--color-ink-faint);" data-action="save-later" data-item="${item.id}">Save for later</button>
      </div>
      <div class="qty-stepper">
        <button data-action="qty-minus" data-item="${item.id}" data-qty="${item.quantity}">−</button>
        <span>${item.quantity}</span>
        <button data-action="qty-plus" data-item="${item.id}" data-qty="${item.quantity}" data-max="${p.stock}">+</button>
      </div>
      <button class="icon-btn" data-action="remove" data-item="${item.id}" aria-label="Remove" style="color:var(--color-danger);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
      </button>
    </div>
  `;
}

function savedLineHtml(item) {
  const p = item.product;
  const img = p.images && p.images[0] ? `<img src="${resolveImg(p.images[0])}">` : `<div class="cart-thumb-fallback">${productEmoji(p.category?.name)}</div>`;
  return `
    <div class="cart-line" data-item="${item.id}" style="grid-template-columns:76px 1fr auto;">
      ${img}
      <div>
        <a href="/product.html?slug=${p.slug}" style="font-weight:600; font-size:14px;">${escapeHtml(p.name)}</a>
        <div class="price price-now" style="display:block; margin-top:4px;">${formatMoney(Number(p.discountPrice ?? p.price))}</div>
      </div>
      <button class="btn btn-outline btn-sm" data-action="move-cart" data-item="${item.id}">Move to cart</button>
    </div>
  `;
}

function wireCartEvents() {
  document.getElementById('cartRoot').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const itemId = btn.dataset.item;

    try {
      if (action === 'qty-minus' || action === 'qty-plus') {
        const current = Number(btn.dataset.qty);
        const max = Number(btn.dataset.max || 999);
        const next = action === 'qty-plus' ? Math.min(current + 1, max) : Math.max(1, current - 1);
        if (next === current) return;
        const cart = await api.patch(`/cart/items/${itemId}`, { quantity: next });
        renderCart(cart);
      } else if (action === 'remove') {
        const cart = await api.delete(`/cart/items/${itemId}`);
        renderCart(cart);
        toast('Removed from cart');
      } else if (action === 'save-later') {
        const cart = await api.patch(`/cart/items/${itemId}/save-for-later`);
        renderCart(cart);
        toast('Saved for later');
      } else if (action === 'move-cart') {
        const cart = await api.patch(`/cart/items/${itemId}/move-to-cart`);
        renderCart(cart);
        toast('Moved to cart', 'success');
      }
      refreshCartBadge();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('couponBtn').addEventListener('click', async () => {
    const input = document.getElementById('couponInput');
    const isRemoving = document.getElementById('couponBtn').textContent.trim() === 'Remove';
    try {
      const cart = isRemoving ? await api.delete('/cart/coupon') : await api.post('/cart/coupon', { code: input.value.trim() });
      renderCart(cart);
      if (!isRemoving) toast('Coupon applied', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
