import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';
import { useAuthStore } from '@/stores/auth.store';

// Configuración base
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.fakerbostero.online/bolsillo/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Instancia separada para refresh (sin interceptors para evitar loops)
const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.fakerbostero.online/bolsillo/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Agregar tokens automáticamente
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Agregar JWT token desde Zustand store
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Agregar X-Account-ID (excepto en endpoints de auth)
    const isAuthEndpoint = config.url?.startsWith('/auth');
    if (!isAuthEndpoint) {
      const accountId = localStorage.getItem('active_account_id');
      if (accountId) {
        config.headers['X-Account-ID'] = accountId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Manejar refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // Si es 401 y no es el endpoint de login/refresh, intentar refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          // Usar instancia separada sin interceptors para evitar loop infinito
          const response = await refreshApi.post('/auth/refresh', {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;

          // Actualizar tokens en Zustand store (esto automáticamente persiste)
          useAuthStore.getState().setTokens(access_token, newRefreshToken);

          // Reintentar request original con nuevo token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(originalRequest);
        } catch (refreshError) {
          // Si refresh falla, logout completo
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      } else {
        // No hay refresh token, logout completo
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
