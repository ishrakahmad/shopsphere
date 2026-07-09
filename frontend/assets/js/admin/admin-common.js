// Renders the admin sidebar + topbar into every admin page.
// Call renderAdminShell('products') etc. with the active nav key.

const ADMIN_NAV = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin/index.html', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { key: 'products', label: 'Products', href: '/admin/products.html', icon: 'M20 7l-8-4-8 4m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'categories', label: 'Categories', href: '/admin/categories.html', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { key: 'orders', label: 'Orders', href: '/admin/orders.html', icon: 'M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM14 2v6h6' },
  { key: 'customers', label: 'Customers', href: '/admin/customers.html', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
];

function renderAdminShell(activeKey) {
  if (!requireAdmin()) return;

  document.getElementById('adminSidebar').innerHTML = `
    <div class="logo">Shop<span class="dot">•</span>Sphere</div>
    <nav class="admin-nav">
      <div class="nav-section">Overview</div>
      ${navLink(ADMIN_NAV[0], activeKey)}
      <div class="nav-section">Catalog</div>
      ${navLink(ADMIN_NAV[1], activeKey)}
      ${navLink(ADMIN_NAV[2], activeKey)}
      <div class="nav-section">Sales</div>
      ${navLink(ADMIN_NAV[3], activeKey)}
      ${navLink(ADMIN_NAV[4], activeKey)}
    </nav>
    <a href="/index.html" class="admin-back-link">← Back to storefront</a>
  `;

  const topbar = document.getElementById('adminTopbar');
  if (topbar) {
    const user = getUser();
    topbar.innerHTML = `
      <button id="adminSidebarToggle" class="icon-btn" style="display:none;" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
      </button>
      <h2 id="adminPageTitle" style="font-size:1.15rem; margin:0;"></h2>
      <div class="flex items-center gap-12" style="margin-left:auto;">
        <button id="themeToggle" class="icon-btn" aria-label="Toggle dark mode"></button>
        <span class="text-sm text-soft">${escapeHtml(user?.name || '')}</span>
        <button id="adminLogoutBtn" class="btn btn-outline btn-sm">Log out</button>
      </div>
    `;
    document.getElementById('adminLogoutBtn').addEventListener('click', logout);
    const themeBtn = document.getElementById('themeToggle');
    themeBtn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark' ? SUN_ICON : MOON_ICON;
    themeBtn.addEventListener('click', toggleTheme);

    document.getElementById('adminSidebarToggle').addEventListener('click', () => {
      document.getElementById('adminSidebar').classList.toggle('open');
    });
  }
}

function navLink(item, activeKey) {
  return `
    <a href="${item.href}" class="${item.key === activeKey ? 'active' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${item.icon}"/></svg>
      ${item.label}
    </a>
  `;
}

function setAdminPageTitle(title) {
  const el = document.getElementById('adminPageTitle');
  if (el) el.textContent = title;
}
