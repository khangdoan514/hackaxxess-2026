import axios from 'axios';

// Use relative /api in dev so Vite proxies to backend (avoids CORS). Set VITE_API_URL in production.
const baseURL = (import.meta.env.VITE_API_URL ?? '').trim();

export const api = axios.create({
  baseURL: baseURL ? `${baseURL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
