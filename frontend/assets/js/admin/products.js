let adminProductsState = { page: 1, limit: 15, search: '' };
let categoriesCache = [];
let newImageFiles = []; // File[] staged for a new product

document.addEventListener('DOMContentLoaded', async () => {
  renderAdminShell('products');
  setAdminPageTitle('Products');

  try { categoriesCache = await api.get('/categories'); } catch { categoriesCache = []; }

  loadProducts();
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
  document.getElementById('searchInput').addEventListener('input', debounce((e) => {
    adminProductsState.search = e.target.value; adminProductsState.page = 1; loadProducts();
  }, 400));
});

async function loadProducts() {
  const tbody = document.getElementById('productsTbody');
  tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:30px;"><div class="loader"></div></td></tr>`;
  try {
    const params = new URLSearchParams({ page: adminProductsState.page, limit: adminProductsState.limit });
    if (adminProductsState.search) params.set('search', adminProductsState.search);
    const res = await api.get(`/products?${params.toString()}`, { auth: false });
    renderTable(res.data);
    renderPagination(res.meta);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:30px; color:var(--color-danger);">${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderTable(products) {
  const tbody = document.getElementById('productsTbody');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:30px;">No products found.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map((p) => `
    <tr>
      <td><div class="table-thumb">${p.images[0] ? `<img src="${resolveImg(p.images[0])}">` : '📦'}</div></td>
      <td>${escapeHtml(p.name)}</td>
      <td class="text-sm text-soft">${escapeHtml(p.category?.name || '—')}</td>
      <td class="price">${formatMoney(p.discountPrice ?? p.price)}</td>
      <td>${p.stock}</td>
      <td>${flagBadges(p)}</td>
      <td><span class="status-pill status-${p.isActive ? 'DELIVERED' : 'CANCELLED'}">${p.isActive ? 'Active' : 'Hidden'}</span></td>
      <td>
        <div class="flex gap-8">
          <button class="action-icon-btn" data-edit="${p.id}" title="Edit">✏️</button>
          <button class="action-icon-btn danger" data-delete="${p.id}" title="Deactivate">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', async () => {
    const full = await api.get(`/products/${btn.dataset.edit}`, { auth: false });
    openProductModal(full);
  }));
  tbody.querySelectorAll('[data-delete]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm('Deactivate this product? It will be hidden from the storefront.')) return;
    try {
      await api.delete(`/products/${btn.dataset.delete}`);
      toast('Product deactivated', 'success');
      loadProducts();
    } catch (err) { toast(err.message, 'error'); }
  }));
}

function flagBadges(p) {
  const flags = [];
  if (p.isFeatured) flags.push('Featured');
  if (p.isNewArrival) flags.push('New');
  if (p.isBestSeller) flags.push('Best');
  if (p.isFlashSale) flags.push('Flash');
  return flags.map((f) => `<span class="tag" style="background:var(--color-surface-sunken); color:var(--color-ink-soft); margin-right:4px;">${f}</span>`).join('') || '<span class="text-faint text-sm">—</span>';
}

function renderPagination(meta) {
  const el = document.getElementById('pagination');
  if (meta.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${meta.page === 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹</button>`;
  for (let i = 1; i <= meta.totalPages; i++) html += `<button class="${i === meta.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
  html += `<button ${meta.page === meta.totalPages ? 'disabled' : ''} data-p="${meta.page + 1}">›</button>`;
  el.innerHTML = html;
  el.querySelectorAll('button[data-p]').forEach((btn) => btn.addEventListener('click', () => {
    adminProductsState.page = Number(btn.dataset.p); loadProducts();
  }));
}

// ---------------- Modal ----------------

function openProductModal(product = null) {
  newImageFiles = [];
  const overlay = document.getElementById('productModalOverlay');
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-head">
        <h3 style="margin:0;">${product ? 'Edit product' : 'Add new product'}</h3>
        <button class="modal-close" id="closeModalBtn">✕</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Product name</label><input id="mfName" value="${escapeHtml(product?.name || '')}"></div>
        <div class="field"><label>SKU</label><input id="mfSku" value="${escapeHtml(product?.sku || '')}" ${product ? 'disabled' : ''}></div>
      </div>
      <div class="field"><label>Description</label><textarea id="mfDesc" rows="3">${escapeHtml(product?.description || '')}</textarea></div>
      <div class="field-row">
        <div class="field"><label>Category</label>
          <select id="mfCategory">${categoriesCache.map((c) => `<option value="${c.id}" ${product?.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Stock</label><input type="number" id="mfStock" value="${product?.stock ?? 0}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Price</label><input type="number" step="0.01" id="mfPrice" value="${product?.price ?? ''}"></div>
        <div class="field"><label>Discount price (optional)</label><input type="number" step="0.01" id="mfDiscount" value="${product?.discountPrice ?? ''}"></div>
      </div>

      <div class="field">
        <label>Flags</label>
        <div class="flex gap-16" style="flex-wrap:wrap;">
          <label class="checkbox-row"><input type="checkbox" id="mfFeatured" ${product?.isFeatured ? 'checked' : ''}> Featured</label>
          <label class="checkbox-row"><input type="checkbox" id="mfNew" ${product?.isNewArrival ? 'checked' : ''}> New arrival</label>
          <label class="checkbox-row"><input type="checkbox" id="mfBest" ${product?.isBestSeller ? 'checked' : ''}> Best seller</label>
          <label class="checkbox-row"><input type="checkbox" id="mfFlash" ${product?.isFlashSale ? 'checked' : ''}> Flash sale</label>
        </div>
      </div>
      <div class="field" id="flashEndWrap" style="${product?.isFlashSale ? '' : 'display:none;'}">
        <label>Flash sale ends</label>
        <input type="datetime-local" id="mfFlashEnd" value="${product?.flashSaleEnd ? toLocalInput(product.flashSaleEnd) : ''}">
      </div>

      <div class="field">
        <label>Images ${product ? '(existing images shown — add more below)' : '(up to 6)'}</label>
        <div class="image-upload-grid" id="existingImagesGrid">
          ${product ? product.images.map((img) => `
            <div class="image-upload-thumb"><img src="${resolveImg(img)}"><button class="remove-img" data-remove-existing="${img}">✕</button></div>
          `).join('') : ''}
        </div>
        <div class="image-upload-grid" id="newImagesGrid"></div>
        <label class="image-upload-add" style="display:inline-flex;">
          +
          <input type="file" id="mfImages" accept="image/*" multiple style="display:none;">
        </label>
      </div>

      <div id="modalError" class="field-error hidden" style="margin-top:6px;"></div>

      <div class="flex gap-12" style="margin-top:20px;">
        <button id="saveProductBtn" class="btn btn-primary">${product ? 'Save changes' : 'Create product'}</button>
        <button id="cancelModalBtn" class="btn btn-ghost">Cancel</button>
      </div>
    </div>
  `;

  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  document.getElementById('mfFlash').addEventListener('change', (e) => {
    document.getElementById('flashEndWrap').style.display = e.target.checked ? '' : 'none';
  });

  document.getElementById('mfImages').addEventListener('change', (e) => {
    newImageFiles = [...newImageFiles, ...Array.from(e.target.files)];
    renderNewImagePreviews();
  });

  overlay.querySelectorAll('[data-remove-existing]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!product) return;
    try {
      await api.delete(`/products/${product.id}/images`, { imageUrl: btn.dataset.removeExisting });
      btn.closest('.image-upload-thumb').remove();
      toast('Image removed');
    } catch (err) { toast(err.message, 'error'); }
  }));

  document.getElementById('saveProductBtn').addEventListener('click', () => saveProduct(product));
}

function renderNewImagePreviews() {
  const grid = document.getElementById('newImagesGrid');
  grid.innerHTML = newImageFiles.map((file, i) => `
    <div class="image-upload-thumb"><img src="${URL.createObjectURL(file)}"><button class="remove-img" data-remove-new="${i}">✕</button></div>
  `).join('');
  grid.querySelectorAll('[data-remove-new]').forEach((btn) => btn.addEventListener('click', () => {
    newImageFiles.splice(Number(btn.dataset.removeNew), 1);
    renderNewImagePreviews();
  }));
}

function closeModal() {
  document.getElementById('productModalOverlay').classList.add('hidden');
  document.getElementById('productModalOverlay').innerHTML = '';
}

async function saveProduct(existing) {
  const errEl = document.getElementById('modalError');
  errEl.classList.add('hidden');
  const btn = document.getElementById('saveProductBtn');

  const fields = {
    name: document.getElementById('mfName').value.trim(),
    description: document.getElementById('mfDesc').value.trim(),
    categoryId: document.getElementById('mfCategory').value,
    stock: Number(document.getElementById('mfStock').value),
    price: Number(document.getElementById('mfPrice').value),
    discountPrice: document.getElementById('mfDiscount').value ? Number(document.getElementById('mfDiscount').value) : undefined,
    isFeatured: document.getElementById('mfFeatured').checked,
    isNewArrival: document.getElementById('mfNew').checked,
    isBestSeller: document.getElementById('mfBest').checked,
    isFlashSale: document.getElementById('mfFlash').checked,
    flashSaleEnd: document.getElementById('mfFlash').checked && document.getElementById('mfFlashEnd').value
      ? new Date(document.getElementById('mfFlashEnd').value).toISOString() : undefined,
  };

  if (!fields.name || !fields.description || !fields.categoryId || !fields.price) {
    errEl.textContent = 'Please fill in name, description, category and price.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    if (existing) {
      await api.patch(`/products/${existing.id}`, fields);
      if (newImageFiles.length > 0) {
        const fd = new FormData();
        newImageFiles.forEach((f) => fd.append('images', f));
        await api.upload(`/products/${existing.id}/images`, fd);
      }
      toast('Product updated', 'success');
    } else {
      const sku = document.getElementById('mfSku').value.trim();
      if (!sku) { errEl.textContent = 'SKU is required.'; errEl.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Create product'; return; }
      const fd = new FormData();
      Object.entries({ ...fields, sku }).forEach(([k, v]) => { if (v !== undefined) fd.append(k, v); });
      newImageFiles.forEach((f) => fd.append('images', f));
      await api.upload('/products', fd);
      toast('Product created', 'success');
    }
    closeModal();
    loadProducts();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
    btn.disabled = false; btn.textContent = existing ? 'Save changes' : 'Create product';
  }
}

function toLocalInput(isoStr) {
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resolveImg(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return API_BASE.replace('/api/v1', '') + path;
}
