import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

export const useResourcesStore = defineStore('resources', () => {
  const resources = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchResources(filters?: { node_id?: string; search?: string }) {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filters?.node_id) params.append('node_id', filters.node_id);
      if (filters?.search) params.append('search', filters.search);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await apiFetch(`/resources${query}`);
      resources.value = response.data || response;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchResourceById(id: string) {
    const response = await apiFetch(`/resources/${id}`);
    return response.data || response;
  }

  // Получить ресурсы для конкретного узла (используется в карточке оборудования)
  async function fetchResourcesForNode(nodeId: string) {
    return await fetchResources({ node_id: nodeId });
  }

  // Создать или обновить ресурс (upsert)
  async function upsertResource(nodeId: string, data: any) {
    const response = await apiFetch(`/resources/${nodeId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await fetchResources(); // обновляем список
    return response.data || response;
  }

  // Удалить ресурс
  async function deleteResource(nodeId: string) {
    await apiFetch(`/resources/${nodeId}`, { method: 'DELETE' });
    await fetchResources();
  }

  // Расчёт ресурса
  async function calculateResource(nodeId: string, workHoursPerYear: number) {
    const response = await apiFetch(`/resources/${nodeId}/calculate`, {
      method: 'POST',
      body: JSON.stringify({ work_hours_per_year: workHoursPerYear })
    });
    return response.data || response;
  }

  return {
    resources,
    isLoading,
    error,
    fetchResources,
    fetchResourceById,
    fetchResourcesForNode,
    upsertResource,
    deleteResource,
    calculateResource,
  };
});