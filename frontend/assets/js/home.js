document.addEventListener('DOMContentLoaded', async () => {
  loadCategories();
  loadSection('featuredGrid', { featured: 'true', limit: 4 });
  loadSection('newArrivalsGrid', { newArrival: 'true', limit: 4 });
  loadSection('bestSellerGrid', { bestSeller: 'true', limit: 4 });
  loadFlashSale();
  loadHeroStats();
});

async function loadHeroStats() {
  try {
    const [products, categories] = await Promise.all([
      api.get('/products?limit=1', { auth: false }),
      api.get('/categories', { auth: false }),
    ]);
    document.getElementById('statProducts').textContent = products.meta.total + '+';
    document.getElementById('statCategories').textContent = categories.length;
  } catch { /* silent */ }
}

async function loadCategories() {
  const wrap = document.getElementById('categoryChips');
  try {
    const categories = await api.get('/categories', { auth: false });
    if (categories.length === 0) {
      wrap.innerHTML = '<span class="text-faint text-sm">No categories yet.</span>';
      return;
    }
    wrap.innerHTML = categories.map((c) => `
      <a href="/shop.html?categoryId=${c.id}" class="chip">${productEmoji(c.name)} ${escapeHtml(c.name)}</a>
    `).join('');
  } catch {
    wrap.innerHTML = '<span class="text-faint text-sm">Could not load categories. Is the backend running?</span>';
  }
}

async function loadSection(gridId, params) {
  const grid = document.getElementById(gridId);
  grid.innerHTML = Array(4).fill('<div class="skeleton" style="aspect-ratio:3/4;"></div>').join('');
  try {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/products?${query}`, { auth: false });
    renderProductGrid(grid, res.data);
    wireProductGridEvents(grid);
    markWishlistedCards(grid);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><h3>Could not load products</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

async function loadFlashSale() {
  try {
    const res = await api.get('/products?flashSale=true&limit=4', { auth: false });
    if (res.data.length === 0) return;

    document.getElementById('flashSection').style.display = '';
    renderProductGrid(document.getElementById('flashGrid'), res.data);
    wireProductGridEvents(document.getElementById('flashGrid'));
    markWishlistedCards(document.getElementById('flashGrid'));

    // Countdown to the earliest flashSaleEnd among shown products
    const ends = res.data.map((p) => p.flashSaleEnd).filter(Boolean).sort();
    if (ends.length) {
      document.getElementById('flashBar').classList.remove('hidden');
      startCountdown(new Date(ends[0]));
    }
  } catch { /* silent */ }
}

function startCountdown(endDate) {
  const h = document.getElementById('fH'), m = document.getElementById('fM'), s = document.getElementById('fS');
  function tick() {
    const diff = Math.max(0, endDate.getTime() - Date.now());
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    h.textContent = String(hrs).padStart(2, '0');
    m.textContent = String(mins).padStart(2, '0');
    s.textContent = String(secs).padStart(2, '0');
    if (diff <= 0) clearInterval(timer);
  }
  tick();
  const timer = setInterval(tick, 1000);
}
