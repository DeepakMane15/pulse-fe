import axios, { type AxiosError } from 'axios';

/**
 * Base URL for the Pulse API (includes `/api` prefix).
 * Dev: leave unset to use Vite proxy (`/api` → localhost:4000).
 */
function resolveBaseURL(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return '/api';
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulse_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export function getApiBaseURL(): string {
  return resolveBaseURL();
}
