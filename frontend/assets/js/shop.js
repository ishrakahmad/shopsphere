const state = {
  page: 1,
  limit: 12,
  search: qs('search', ''),
  categoryId: qs('categoryId', ''),
  minPrice: qs('minPrice', ''),
  maxPrice: qs('maxPrice', ''),
  minRating: qs('minRating', ''),
  sort: qs('sort', 'newest'),
  featured: qs('featured', ''),
  newArrival: qs('newArrival', ''),
  bestSeller: qs('bestSeller', ''),
  flashSale: qs('flashSale', ''),
};

document.addEventListener('DOMContentLoaded', () => {
  // Reflect URL state into the form controls
  document.getElementById('minPrice').value = state.minPrice;
  document.getElementById('maxPrice').value = state.maxPrice;
  document.getElementById('sortSelect').value = state.sort;
  document.getElementById('fFeatured').checked = state.featured === 'true';
  document.getElementById('fNew').checked = state.newArrival === 'true';
  document.getElementById('fBest').checked = state.bestSeller === 'true';
  document.getElementById('fFlash').checked = state.flashSale === 'true';
  if (state.minRating) {
    const radio = document.querySelector(`input[name="minRating"][value="${state.minRating}"]`);
    if (radio) radio.checked = true;
  }

  loadCategoryFilters();
  fetchAndRender();

  document.getElementById('sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; syncAndFetch(); });
  document.getElementById('applyPriceBtn').addEventListener('click', () => {
    state.minPrice = document.getElementById('minPrice').value;
    state.maxPrice = document.getElementById('maxPrice').value;
    state.page = 1; syncAndFetch();
  });
  document.querySelectorAll('input[name="minRating"]').forEach((r) => r.addEventListener('change', (e) => { state.minRating = e.target.value; state.page = 1; syncAndFetch(); }));
  document.getElementById('fFeatured').addEventListener('change', (e) => { state.featured = e.target.checked ? 'true' : ''; state.page = 1; syncAndFetch(); });
  document.getElementById('fNew').addEventListener('change', (e) => { state.newArrival = e.target.checked ? 'true' : ''; state.page = 1; syncAndFetch(); });
  document.getElementById('fBest').addEventListener('change', (e) => { state.bestSeller = e.target.checked ? 'true' : ''; state.page = 1; syncAndFetch(); });
  document.getElementById('fFlash').addEventListener('change', (e) => { state.flashSale = e.target.checked ? 'true' : ''; state.page = 1; syncAndFetch(); });
  document.getElementById('clearFiltersBtn').addEventListener('click', () => { window.location.href = '/shop.html'; });
});

async function loadCategoryFilters() {
  const wrap = document.getElementById('categoryFilters');
  try {
    const categories = await api.get('/categories', { auth: false });
    wrap.innerHTML = `
      <label class="filter-option"><input type="radio" name="cat" value="" ${!state.categoryId ? 'checked' : ''}> All categories</label>
      ${categories.map((c) => `
        <label class="filter-option"><input type="radio" name="cat" value="${c.id}" ${state.categoryId === c.id ? 'checked' : ''}> ${escapeHtml(c.name)}</label>
      `).join('')}
    `;
    wrap.querySelectorAll('input[name="cat"]').forEach((r) => r.addEventListener('change', (e) => {
      state.categoryId = e.target.value; state.page = 1; syncAndFetch();
    }));
  } catch {
    wrap.innerHTML = '<span class="text-faint text-sm">Could not load categories.</span>';
  }
}

function syncAndFetch() {
  setQueryParams(state);
  fetchAndRender();
}

async function fetchAndRender() {
  const grid = document.getElementById('productGrid');
  const resultCount = document.getElementById('resultCount');
  grid.innerHTML = Array(8).fill('<div class="skeleton" style="aspect-ratio:3/4;"></div>').join('');
  resultCount.textContent = 'Loading...';

  const params = new URLSearchParams();
  Object.entries(state).forEach(([k, v]) => { if (v !== '' && v != null) params.set(k, v); });

  try {
    const res = await api.get(`/products?${params.toString()}`, { auth: false });
    renderProductGrid(grid, res.data);
    wireProductGridEvents(grid);
    markWishlistedCards(grid);
    resultCount.textContent = `${res.meta.total} product${res.meta.total === 1 ? '' : 's'} found`;
    renderPagination(res.meta);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><h3>Could not load products</h3><p>${escapeHtml(err.message)}</p></div>`;
    resultCount.textContent = '';
  }
}

function renderPagination(meta) {
  const el = document.getElementById('pagination');
  if (meta.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button ${meta.page === 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹</button>`;
  for (let i = 1; i <= meta.totalPages; i++) {
    if (i === 1 || i === meta.totalPages || Math.abs(i - meta.page) <= 1) {
      html += `<button class="${i === meta.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
    } else if (Math.abs(i - meta.page) === 2) {
      html += `<span style="padding:8px 4px;">…</span>`;
    }
  }
  html += `<button ${meta.page === meta.totalPages ? 'disabled' : ''} data-p="${meta.page + 1}">›</button>`;
  el.innerHTML = html;
  el.querySelectorAll('button[data-p]').forEach((btn) => btn.addEventListener('click', () => {
    state.page = Number(btn.dataset.p);
    syncAndFetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}
