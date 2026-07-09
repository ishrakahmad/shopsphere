let checkoutState = { cart: null, addresses: [], billingId: null, shippingId: null, sameAsBilling: true };

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  await loadCheckout();
});

async function loadCheckout() {
  const root = document.getElementById('checkoutRoot');
  try {
    const [cart, addresses] = await Promise.all([api.get('/cart'), api.get('/addresses')]);
    if (cart.items.length === 0) {
      root.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><h3>Your cart is empty</h3><p>Add some products before checking out.</p><a href="/shop.html" class="btn btn-primary">Browse products</a></div>`;
      return;
    }
    checkoutState.cart = cart;
    checkoutState.addresses = addresses;
    const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
    if (defaultAddr) { checkoutState.billingId = defaultAddr.id; checkoutState.shippingId = defaultAddr.id; }
    render();
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Could not load checkout</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function render() {
  const { cart, addresses } = checkoutState;
  const root = document.getElementById('checkoutRoot');

  root.innerHTML = `
    <div class="checkout-layout">
      <div>
        <div class="panel" style="margin-bottom:20px;">
          <div class="step-title"><span class="step-num">1</span> Shipping address</div>
          <div id="addressList" class="address-grid">
            ${addresses.length === 0 ? `<p class="text-sm text-soft">No saved addresses yet — add one below.</p>` : addresses.map(addressCardHtml).join('')}
          </div>
          <button id="toggleAddAddress" class="btn btn-outline btn-sm">+ Add new address</button>
          <div id="addAddressForm" class="hidden" style="margin-top:16px;">${addressFormHtml()}</div>
        </div>

        <div class="panel">
          <label class="checkbox-row" style="margin-bottom:14px;">
            <input type="checkbox" id="sameAsBilling" ${checkoutState.sameAsBilling ? 'checked' : ''}> Billing address same as shipping
          </label>
          <div class="step-title"><span class="step-num">2</span> Payment method</div>
          <div class="address-card selected" style="cursor:default;">
            <h4>💵 Cash on Delivery</h4>
            <p class="text-sm text-soft" style="margin:0;">Pay with cash when your order arrives. More payment methods coming soon.</p>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Order summary</div>
        ${cart.items.map((i) => `
          <div class="summary-row"><span>${escapeHtml(i.product.name)} × ${i.quantity}</span><span class="price">${formatMoney(Number(i.product.discountPrice ?? i.product.price) * i.quantity)}</span></div>
        `).join('')}
        <hr style="border:none; border-top:1px solid var(--color-border); margin:10px 0;">
        <div class="summary-row"><span>Subtotal</span><span class="price">${formatMoney(cart.subtotal)}</span></div>
        <div class="summary-row"><span>Discount</span><span class="price">−${formatMoney(cart.discount)}</span></div>
        <div class="summary-row"><span>Shipping</span><span class="price">${cart.shipping === 0 ? 'FREE' : formatMoney(cart.shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span class="price">${formatMoney(cart.total)}</span></div>

        <div id="checkoutError" class="field-error hidden" style="margin-top:10px;"></div>
        <button id="placeOrderBtn" class="btn btn-primary btn-block" style="margin-top:16px;" ${addresses.length === 0 ? 'disabled' : ''}>
          Place order (COD)
        </button>
      </div>
    </div>
  `;

  wireCheckoutEvents();
}

function addressCardHtml(addr) {
  const selected = checkoutState.shippingId === addr.id;
  return `
    <div class="address-card ${selected ? 'selected' : ''}" data-addr="${addr.id}">
      <h4>${escapeHtml(addr.fullName)} ${addr.isDefault ? '<span class="text-faint" style="font-weight:400; font-size:11px;">(default)</span>' : ''}</h4>
      <p class="text-sm text-soft" style="margin:0;">${escapeHtml(addr.addressLine)}, ${escapeHtml(addr.city)}${addr.state ? ', ' + escapeHtml(addr.state) : ''} ${escapeHtml(addr.postalCode)}, ${escapeHtml(addr.country)}</p>
      <p class="text-sm text-faint" style="margin:4px 0 0;">📞 ${escapeHtml(addr.phone)}</p>
    </div>
  `;
}

function addressFormHtml() {
  return `
    <div class="field-row">
      <div class="field"><label>Full name</label><input id="afName" placeholder="Jane Doe"></div>
      <div class="field"><label>Phone</label><input id="afPhone" placeholder="+880..."></div>
    </div>
    <div class="field"><label>Address line</label><input id="afLine" placeholder="House, road, area"></div>
    <div class="field-row">
      <div class="field"><label>City</label><input id="afCity" placeholder="Dhaka"></div>
      <div class="field"><label>State/Region (optional)</label><input id="afState" placeholder=""></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Postal code</label><input id="afPostal" placeholder="1207"></div>
      <div class="field"><label>Country</label><input id="afCountry" placeholder="Bangladesh"></div>
    </div>
    <label class="checkbox-row" style="margin-bottom:14px;"><input type="checkbox" id="afDefault"> Set as default address</label>
    <button id="saveAddressBtn" class="btn btn-primary btn-sm">Save address</button>
  `;
}

function wireCheckoutEvents() {
  document.getElementById('toggleAddAddress').addEventListener('click', () => {
    document.getElementById('addAddressForm').classList.toggle('hidden');
  });

  document.querySelectorAll('[data-addr]').forEach((card) => {
    card.addEventListener('click', () => {
      checkoutState.shippingId = card.dataset.addr;
      if (checkoutState.sameAsBilling) checkoutState.billingId = card.dataset.addr;
      render();
    });
  });

  document.getElementById('sameAsBilling').addEventListener('change', (e) => {
    checkoutState.sameAsBilling = e.target.checked;
    if (e.target.checked) checkoutState.billingId = checkoutState.shippingId;
  });

  const saveBtn = document.getElementById('saveAddressBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const payload = {
        type: 'SHIPPING',
        fullName: document.getElementById('afName').value.trim(),
        phone: document.getElementById('afPhone').value.trim(),
        addressLine: document.getElementById('afLine').value.trim(),
        city: document.getElementById('afCity').value.trim(),
        state: document.getElementById('afState').value.trim() || undefined,
        postalCode: document.getElementById('afPostal').value.trim(),
        country: document.getElementById('afCountry').value.trim(),
        isDefault: document.getElementById('afDefault').checked,
      };
      if (!payload.fullName || !payload.phone || !payload.addressLine || !payload.city || !payload.postalCode || !payload.country) {
        toast('Please fill in all required address fields', 'error');
        return;
      }
      try {
        const newAddr = await api.post('/addresses', payload);
        checkoutState.addresses.push(newAddr);
        checkoutState.shippingId = newAddr.id;
        checkoutState.billingId = newAddr.id;
        toast('Address saved', 'success');
        render();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);
}

async function placeOrder() {
  const errEl = document.getElementById('checkoutError');
  errEl.classList.add('hidden');
  const btn = document.getElementById('placeOrderBtn');

  if (!checkoutState.shippingId || !checkoutState.billingId) {
    errEl.textContent = 'Please select or add a shipping address.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true; btn.textContent = 'Placing order...';
  try {
    const order = await api.post('/orders/checkout', {
      billingAddressId: checkoutState.billingId,
      shippingAddressId: checkoutState.shippingId,
      paymentMethod: 'COD',
    });
    toast('Order placed successfully!', 'success');
    window.location.href = `/order-detail.html?id=${order.id}`;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Place order (COD)';
  }
}
