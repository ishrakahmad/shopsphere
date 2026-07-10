// Shared helpers used across every page.

function formatMoney(amount) {
  const n = Number(amount || 0);
  return `$${n.toFixed(2)}`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function starString(rating) {
  const r = Math.round(Number(rating || 0));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function debounce(fn, wait = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function qs(name, fallback = null) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) ?? fallback;
}

function setQueryParams(paramsObj) {
  const url = new URL(window.location.href);
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  });
  window.history.replaceState({}, '', url);
}

function toast(message, type = 'default') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function productEmoji(categoryName = '') {
  const map = {
    Electronics: '🎧', Fashion: '👗', 'Home & Living': '🏠',
    'Beauty & Health': '💄', 'Sports & Outdoors': '🏋️',
  };
  return map[categoryName] || '🛍️';
}

function resolveImg(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return window.SHOPSPHERE_CONFIG.API_BASE_URL.replace('/api/v1', '') + path;
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('ss_user') || 'null'); } catch { return null; }
}
function getToken() { return localStorage.getItem('ss_token'); }
function isLoggedIn() { return !!getToken(); }
function isAdmin() { return getUser()?.role === 'ADMIN'; }
function logout() {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = '/index.html';
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return false;
  }
  return true;
}

function requireAdmin() {
  if (!isLoggedIn() || !isAdmin()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}
