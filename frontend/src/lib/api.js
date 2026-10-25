import { API_URL } from '../config';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let getToken = () => null;
let onUnauthorized = () => {};
export const configureApi = ({ token, unauthorized }) => { getToken = token; onUnauthorized = unauthorized; };

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response;
  try { response = await fetch(`${API_URL}${path}`, { ...options, headers }); }
  catch { throw new ApiError(0, 'NETWORK_ERROR', 'Something went wrong. Please try again.'); }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error || {};
    const apiError = new ApiError(response.status, error.code || 'SERVER_ERROR', error.message || 'Something went wrong. Please try again.', error.details);
    if (response.status === 401) onUnauthorized();
    throw apiError;
  }
  return payload;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const patch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
