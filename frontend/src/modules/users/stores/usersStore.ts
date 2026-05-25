import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

export const useUsersStore = defineStore('users', () => {
  const users = ref<any[]>([]);
  const roles = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiFetch('/users');
      users.value = response.data || response;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchRoles() {
    try {
      const response = await apiFetch('/users/roles');
      roles.value = response.data || response;
    } catch (err: any) {
      console.error(err);
    }
  }

  async function createUser(userData: any) {
    const response = await apiFetch('/users', { method: 'POST', body: JSON.stringify(userData) });
    await fetchUsers();
    return response.data || response;
  }

  async function updateUser(id: number, userData: any) {
    const response = await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
    await fetchUsers();
    return response.data || response;
  }

  async function deleteUser(id: number) {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    await fetchUsers();
  }

  return {
    users,
    roles,
    isLoading,
    error,
    fetchUsers,
    fetchRoles,
    createUser,
    updateUser,
    deleteUser,
  };
});