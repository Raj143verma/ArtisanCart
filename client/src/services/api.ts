import axios from 'axios';
import type { ApiResponse } from '../types/auth';

const baseURL =
  (typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
    : undefined) || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken: string | null =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem('artisan_access_token')
    : null;
let refreshPromise: Promise<string | null> | null = null;
let authFailureListeners: Array<() => void> = [];

export function onAuthFailure(listener: () => void) {
  authFailureListeners.push(listener);
  return () => {
    authFailureListeners = authFailureListeners.filter((l) => l !== listener);
  };
}

export function notifyAuthFailure() {
  setAccessToken(null);
  authFailureListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener error
    }
  });
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem('artisan_access_token', token);
    } else {
      localStorage.removeItem('artisan_access_token');
    }
  }
}

export function getAccessToken() {
  return accessToken;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data } = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true },
        );

        const newToken = data?.data?.accessToken ?? null;
        if (newToken) {
          setAccessToken(newToken);
          return newToken;
        }

        notifyAuthFailure();
        return null;
      } catch {
        notifyAuthFailure();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Reject immediately if no request config, status is not 401, or already retried once
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || '';
    const isNoRefreshEndpoint =
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register');

    if (isNoRefreshEndpoint) {
      if (url.includes('/auth/refresh-token')) {
        notifyAuthFailure();
      }
      return Promise.reject(error);
    }

    // Mark retry attempt once to prevent any infinite loop
    originalRequest._retry = true;

    // Single-flight refresh lock: wait for active or newly created refresh promise
    const token = await refreshAccessToken();
    if (!token) {
      return Promise.reject(error);
    }

    // Update authorization header with new token and retry the original request
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${token}`;

    return api(originalRequest);
  },
);

export default api;
