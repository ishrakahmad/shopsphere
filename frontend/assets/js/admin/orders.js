let adminOrderState = { page: 1, limit: 15, status: '' };
const STATUS_FLOW = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

document.addEventListener('DOMContentLoaded', () => {
  renderAdminShell('orders');
  setAdminPageTitle('Orders');
  loadOrders();

  document.querySelectorAll('#statusFilters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#statusFilters .chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      adminOrderState.status = chip.dataset.status;
      adminOrderState.page = 1;
      loadOrders();
    });
  });
});

async function loadOrders() {
  const tbody = document.getElementById('ordersTbody');
  tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:30px;"><div class="loader"></div></td></tr>`;
  try {
    const params = new URLSearchParams({ page: adminOrderState.page, limit: adminOrderState.limit });
    if (adminOrderState.status) params.set('status', adminOrderState.status);
    const res = await api.get(`/orders?${params.toString()}`);
    renderTable(res.data);
    renderPagination(res.meta);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:30px; color:var(--color-danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable(orders) {
  const tbody = document.getElementById('ordersTbody');
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:30px;">No orders found.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map((o) => `
    <tr>
      <td class="price">${escapeHtml(o.orderNumber)}</td>
      <td>${escapeHtml(o.user?.name || '—')}<br><span class="text-faint text-sm">${escapeHtml(o.user?.email || '')}</span></td>
      <td class="text-sm">${formatDate(o.createdAt)}</td>
      <td class="price">${formatMoney(o.total)}</td>
      <td><span class="status-pill status-${o.payment?.status || 'PENDING'}">${o.paymentMethod}</span></td>
      <td><span class="status-pill status-${o.status}">${o.status}</span></td>
      <td><button class="btn btn-outline btn-sm" data-manage="${o.id}">Manage</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-manage]').forEach((btn) => btn.addEventListener('click', () => openOrderModal(btn.dataset.manage)));
}

function renderPagination(meta) {
  const el = document.getElementById('pagination');
  if (meta.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${meta.page === 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹</button>`;
  for (let i = 1; i <= meta.totalPages; i++) html += `<button class="${i === meta.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
  html += `<button ${meta.page === meta.totalPages ? 'disabled' : ''} data-p="${meta.page + 1}">›</button>`;
  el.innerHTML = html;
  el.querySelectorAll('button[data-p]').forEach((btn) => btn.addEventListener('click', () => { adminOrderState.page = Number(btn.dataset.p); loadOrders(); }));
}

async function openOrderModal(id) {
  const overlay = document.getElementById('orderModalOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="modal-box"><div class="loader"></div></div>`;

  try {
    const o = await api.get(`/orders/${id}`);
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-head">
          <h3 style="margin:0;">${escapeHtml(o.orderNumber)}</h3>
          <button class="modal-close" id="closeOrderModal">✕</button>
        </div>
        <p class="text-sm text-soft">${escapeHtml(o.user.name)} · ${escapeHtml(o.user.email)} · ${formatDate(o.createdAt)}</p>

        <div class="table-wrap" style="margin:14px 0;">
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>${o.items.map((i) => `<tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td class="price">${formatMoney(i.price)}</td></tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="summary-row total"><span>Total</span><span class="price">${formatMoney(o.total)}</span></div>

        <div class="field" style="margin-top:16px;">
          <label>Order status</label>
          <select id="statusSelect">
            ${STATUS_FLOW.map((s) => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div id="orderModalError" class="field-error hidden"></div>
        <div class="flex gap-12" style="margin-top:16px;">
          <button id="updateStatusBtn" class="btn btn-primary">Update status</button>
          <button id="closeOrderModal2" class="btn btn-ghost">Close</button>
        </div>
      </div>
    `;

    const close = () => overlay.classList.add('hidden');
    document.getElementById('closeOrderModal').addEventListener('click', close);
    document.getElementById('closeOrderModal2').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    document.getElementById('updateStatusBtn').addEventListener('click', async () => {
      const errEl = document.getElementById('orderModalError');
      try {
        await api.patch(`/orders/${o.id}/status`, { status: document.getElementById('statusSelect').value });
        toast('Order status updated', 'success');
        close();
        loadOrders();
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  } catch (err) {
    overlay.innerHTML = `<div class="modal-box"><p style="color:var(--color-danger);">${escapeHtml(err.message)}</p></div>`;
  }
}
