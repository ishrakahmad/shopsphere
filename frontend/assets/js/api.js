// Thin fetch wrapper around the ShopSphere REST API.
// Automatically attaches the JWT (if present) and unwraps JSON / errors.

const API_BASE = window.SHOPSPHERE_CONFIG.API_BASE_URL;

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function apiRequest(path, { method = 'GET', body, auth = true, isFormData = false } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = localStorage.getItem('ss_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    throw new ApiError('Could not reach the server. Is the backend running?', 0, null);
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    const msg = Array.isArray(message) ? message.join(', ') : message;

    // Session expired / invalid token -> force logout except on auth pages
    if (res.status === 401 && auth) {
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
    }

    throw new ApiError(msg, res.status, data);
  }

  return data;
}

const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: 'PATCH', body }),
  delete: (path, body, opts) => apiRequest(path, { ...opts, method: 'DELETE', body }),
  upload: (path, formData, opts) => apiRequest(path, { ...opts, method: 'POST', body: formData, isFormData: true }),
};
