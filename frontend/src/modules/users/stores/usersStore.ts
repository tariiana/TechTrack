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
      const data = await apiFetch('/users');
      users.value = data;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchRoles() {
    try {
      const data = await apiFetch('/users/roles');
      roles.value = data;
    } catch (err: any) {
      console.error(err);
    }
  }

  async function createUser(userData: any) {
    const newUser = await apiFetch('/users', { method: 'POST', body: JSON.stringify(userData) });
    await fetchUsers();
    return newUser;
  }

  async function updateUser(id: string, userData: any) {
    const updated = await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) });
    await fetchUsers();
    return updated;
  }

  async function deleteUser(id: string) {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    await fetchUsers();
  }

  return { users, roles, isLoading, error, fetchUsers, fetchRoles, createUser, updateUser, deleteUser };
});