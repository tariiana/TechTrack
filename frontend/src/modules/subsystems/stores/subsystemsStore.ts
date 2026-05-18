import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

export const useSubsystemStore = defineStore('subsystem', () => {
  const subsystems = ref<any[]>([]);
  const tree = ref<any[]>([]);
  const isLoading = ref(false);

  async function fetchTree() {
    isLoading.value = true;
    try {
      tree.value = await apiFetch('/subsystems/tree');
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAll() {
    subsystems.value = await apiFetch('/subsystems');
  }

  async function create(data: any) {
    const newItem = await apiFetch('/subsystems', { method: 'POST', body: JSON.stringify(data) });
    await fetchTree();
    return newItem;
  }

  async function update(id: string, data: any) {
    const updated = await apiFetch(`/subsystems/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchTree();
    return updated;
  }

  async function remove(id: string) {
    await apiFetch(`/subsystems/${id}`, { method: 'DELETE' });
    await fetchTree();
  }

  return { subsystems, tree, isLoading, fetchTree, fetchAll, create, update, remove };
});