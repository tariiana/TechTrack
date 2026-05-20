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
      
      if (response && response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        user.value = response.user;
        error.value = '';
        return true;
      }
      
      error.value = 'Неверный логин или пароль';
      return false;
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Обработка разных типов ошибок
      const errorMessage = err.message || '';
      
      if (errorMessage.includes('401') || errorMessage.includes('Неверный')) {
        error.value = 'Неверный логин или пароль';
      } else if (errorMessage.includes('fetch') || errorMessage.includes('Network')) {
        error.value = 'Ошибка подключения к серверу. Проверьте соединение.';
      } else if (errorMessage.includes('Сессия')) {
        error.value = 'Неверный логин или пароль';
      } else {
        error.value = 'Неверный логин или пароль';
      }
      
      return false;
    } finally {
      isLoading.value = false;
    }
  }

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
        try {
          user.value = JSON.parse(userData);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    }
  }

  return { user, isLoading, error, login, logout, checkAuth, fetchMe };
});