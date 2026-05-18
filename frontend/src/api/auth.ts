import { apiFetch } from './client';

export const authApi = {
  login: (login: string, password: string) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    }),
  getCurrentUser: () =>
    apiFetch('/auth/me'),
};