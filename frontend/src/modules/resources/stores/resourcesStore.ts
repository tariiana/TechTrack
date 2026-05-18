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
      const data = await apiFetch(`/resources${query}`);
      resources.value = data;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchResourceById(id: string) {
    return await apiFetch(`/resources/${id}`);
  }

  async function fetchResourcesForNode(nodeId: string) {
    return await apiFetch(`/resources/by-node/${nodeId}`);
  }

  async function createResource(data: any) {
    const newItem = await apiFetch('/resources', { method: 'POST', body: JSON.stringify(data) });
    await fetchResources();
    return newItem;
  }

  async function updateResource(id: string, data: any) {
    const updated = await apiFetch(`/resources/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchResources();
    return updated;
  }

  async function updateResourceByWorkMode(resourceId: string, nodeId: string, workHoursPerYear: number) {
  try {
    const calcResult = await calculateResource(resourceId, workHoursPerYear);
    if (calcResult && calcResult.calculated_resource_percent !== undefined) {
      const resource = await fetchResourceById(resourceId);
      const newParams = { ...resource.resource_params, calculated_percent: calcResult.calculated_resource_percent };
      await updateResource(resourceId, { resource_params: newParams });
      return true;
    }
    return false;
  } catch (err) {
    console.error(err);
    return false;
  }
}
  async function deleteResource(id: string) {
    await apiFetch(`/resources/${id}`, { method: 'DELETE' });
    await fetchResources();
  }

  async function calculateResource(id: string, workHoursPerYear: number) {
    return await apiFetch(`/resources/${id}/calculate`, {
      method: 'POST',
      body: JSON.stringify({ work_hours_per_year: workHoursPerYear }),
    });
  }

  return {
    resources,
    isLoading,
    error,
    fetchResources,
    fetchResourceById,
    fetchResourcesForNode,
    createResource,
    updateResource,
    deleteResource,
    calculateResource,
  };
});