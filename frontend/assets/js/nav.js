// Runs on every page: dark mode, header cart/wishlist counts, search box, user menu.

(function initTheme() {
  const saved = localStorage.getItem('ss_theme');
  const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('ss_theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = next === 'dark' ? SUN_ICON : MOON_ICON;
}

const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

async function refreshCartBadge() {
  const el = document.getElementById('cartCount');
  if (!el) return;
  if (!isLoggedIn()) { el.classList.add('hidden'); return; }
  try {
    const cart = await api.get('/cart');
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    el.textContent = count;
    el.classList.toggle('hidden', count === 0);
  } catch { /* silent */ }
}

async function refreshWishlistBadge() {
  const el = document.getElementById('wishlistCount');
  if (!el) return;
  if (!isLoggedIn()) { el.classList.add('hidden'); return; }
  try {
    const list = await api.get('/wishlist');
    el.textContent = list.length;
    el.classList.toggle('hidden', list.length === 0);
  } catch { /* silent */ }
}

function renderUserMenu() {
  const area = document.getElementById('userMenuArea');
  if (!area) return;
  const user = getUser();
  if (!user) {
    area.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Log in</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Sign up</a>
    `;
    return;
  }
  area.innerHTML = `
    <div class="user-menu-wrap" style="position:relative;">
      <button id="userMenuBtn" class="icon-btn" title="${escapeHtml(user.name)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
      <div id="userMenuDropdown" class="hidden" style="position:absolute; right:0; top:48px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); box-shadow:var(--shadow-md); min-width:190px; padding:8px; z-index:200;">
        <div style="padding:8px 10px; font-size:12.5px; color:var(--color-ink-faint); border-bottom:1px solid var(--color-border); margin-bottom:6px;">${escapeHtml(user.name)}</div>
        <a href="/account.html" style="display:block; padding:9px 10px; border-radius:6px; font-size:13.5px;">My Account</a>
        <a href="/orders.html" style="display:block; padding:9px 10px; border-radius:6px; font-size:13.5px;">My Orders</a>
        <a href="/wishlist.html" style="display:block; padding:9px 10px; border-radius:6px; font-size:13.5px;">Wishlist</a>
        ${user.role === 'ADMIN' ? '<a href="/admin/index.html" style="display:block; padding:9px 10px; border-radius:6px; font-size:13.5px; color:var(--color-primary);">Admin Panel</a>' : ''}
        <button id="logoutBtn" style="display:block; width:100%; text-align:left; padding:9px 10px; border-radius:6px; font-size:13.5px; background:none; border:none; color:var(--color-danger);">Log out</button>
      </div>
    </div>
  `;
  document.getElementById('userMenuBtn').addEventListener('click', () => {
    document.getElementById('userMenuDropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.user-menu-wrap');
    if (wrap && !wrap.contains(e.target)) document.getElementById('userMenuDropdown')?.classList.add('hidden');
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

function initSearchBox() {
  const form = document.getElementById('searchForm');
  if (!form) return;
  const input = document.getElementById('searchInput');
  const existing = qs('search');
  if (existing && input) input.value = existing;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    window.location.href = `/shop.html${val ? `?search=${encodeURIComponent(val)}` : ''}`;
  });
}

function initMobileNav() {
  const toggle = document.getElementById('mobileNavToggle');
  const drawer = document.getElementById('mobileNavDrawer');
  if (!toggle || !drawer) return;
  toggle.addEventListener('click', () => drawer.classList.toggle('hidden'));
}

document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? SUN_ICON : MOON_ICON;
    themeBtn.addEventListener('click', toggleTheme);
  }
  renderUserMenu();
  refreshCartBadge();
  refreshWishlistBadge();
  initSearchBox();
  initMobileNav();
});
