import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const isLoading = ref(false);
  const error = ref('');

  async function login(login: string, password: string) {
    isLoading.value = true;
    error.value = '';
    try {
      const response = await authApi.login(login, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      user.value = response.user;
      return true;
    } catch (err: any) {
      error.value = err.message || 'Ошибка входа';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Добавить этот метод
  async function fetchMe() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const response = await authApi.getCurrentUser();
      user.value = response.user;
      return response.user;
    } catch (err) {
      console.error('fetchMe error:', err);
      logout();
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    user.value = null;
  }

  function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        user.value = JSON.parse(userData);
      }
    }
  }

  return { user, isLoading, error, login, logout, checkAuth, fetchMe };
});