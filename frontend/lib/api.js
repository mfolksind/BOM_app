// Client-side API request handler with JWT token interceptor and refresh handling

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errors = data?.errors || [];
  }
}

/**
 * Format API error into a friendly single-line or multi-line message
 * Supports backend validation shape: { success: false, message: "Validation failed", errors: [{ field, message }] }
 */
export function formatApiError(err, fallback = 'Operation failed') {
  if (!err) return fallback;

  // If err has errors array from validation
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors
      .map((e) => (e.message || (e.field ? `${e.field}: invalid value` : String(e))))
      .join('; ');
  }

  if (err.data && Array.isArray(err.data.errors) && err.data.errors.length > 0) {
    return err.data.errors
      .map((e) => (e.message || (e.field ? `${e.field}: invalid value` : String(e))))
      .join('; ');
  }

  return err.message || fallback;
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const getStoredTokens = () => {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('erp_access_token'),
    refreshToken: localStorage.getItem('erp_refresh_token'),
  };
};

export const setStoredTokens = (tokens) => {
  if (typeof window === 'undefined') return;
  if (tokens.accessToken) {
    localStorage.setItem('erp_access_token', tokens.accessToken);
  }
  if (tokens.refreshToken) {
    localStorage.setItem('erp_refresh_token', tokens.refreshToken);
  }
};

export const clearStoredTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('erp_access_token');
  localStorage.removeItem('erp_refresh_token');
  localStorage.removeItem('erp_user_profile');
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('erp_user_profile');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('erp_user_profile', JSON.stringify(user));
};

export async function apiClient(endpoint, options = {}) {
  const { headers = {}, body, requiresAuth = true, ...rest } = options;
  const { accessToken, refreshToken } = getStoredTokens();

  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requiresAuth && accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let res;
  try {
    res = await fetch(url, {
      ...rest,
      headers: reqHeaders,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    throw new ApiError('Unable to connect to server. Ensure backend is running.', 0);
  }

  // Handle Token Refresh if 401 and we have a refreshToken
  if (res.status === 401 && requiresAuth && refreshToken && !endpoint.includes('/auth/refresh')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newAccessToken) => {
        reqHeaders['Authorization'] = `Bearer ${newAccessToken}`;
        return fetch(url, {
          ...rest,
          headers: reqHeaders,
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        }).then(handleResponse);
      });
    }

    isRefreshing = true;

    try {
      const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const refreshJson = await refreshRes.json();

      if (refreshRes.ok && refreshJson.data?.accessToken) {
        setStoredTokens(refreshJson.data);
        processQueue(null, refreshJson.data.accessToken);

        reqHeaders['Authorization'] = `Bearer ${refreshJson.data.accessToken}`;
        const retryRes = await fetch(url, {
          ...rest,
          headers: reqHeaders,
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        });
        return handleResponse(retryRes);
      } else {
        processQueue(new Error('Session expired'), null);
        clearStoredTokens();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login?expired=1';
        }
        throw new ApiError('Session expired. Please log in again.', 401);
      }
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      clearStoredTokens();
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  return handleResponse(res);
}

async function handleResponse(res) {
  let json;
  try {
    json = await res.json();
  } catch (e) {
    if (!res.ok) {
      throw new ApiError(`HTTP Error ${res.status}: ${res.statusText}`, res.status);
    }
    return { success: true };
  }

  if (!res.ok) {
    let message = json.message || json.error || `Request failed with status ${res.status}`;
    if (Array.isArray(json.errors) && json.errors.length > 0) {
      const details = json.errors
        .map((e) => e.message || (e.field ? `${e.field}: invalid value` : String(e)))
        .join('; ');
      message = details || message;
    }
    throw new ApiError(message, res.status, json);
  }

  return json;
}

export const api = {
  get: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => apiClient(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options = {}) => apiClient(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' }),
};
