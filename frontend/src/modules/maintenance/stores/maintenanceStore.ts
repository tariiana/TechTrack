import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

export const useMaintenanceStore = defineStore('maintenance', () => {
  const plans = ref<any[]>([]);
  const tasks = ref<any[]>([]);
  const isLoading = ref(false);

  async function fetchPlans() {
    isLoading.value = true;
    try {
      plans.value = await apiFetch('/maintenance/plans');
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchPlanById(id: string) {
    return await apiFetch(`/maintenance/plans/${id}`);
  }

  async function createPlan(data: any) {
    const newPlan = await apiFetch('/maintenance/plans', { method: 'POST', body: JSON.stringify(data) });
    await fetchPlans();
    return newPlan;
  }

  async function updatePlan(id: string, data: any) {
    const updated = await apiFetch(`/maintenance/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchPlans();
    return updated;
  }

  async function deletePlan(id: string) {
    await apiFetch(`/maintenance/plans/${id}`, { method: 'DELETE' });
    await fetchPlans();
  }

  async function fetchTasks(filters?: { node_id?: string; status_id?: number; type_id?: number }) {
    const params = new URLSearchParams();
    if (filters?.node_id) params.append('node_id', filters.node_id);
    if (filters?.status_id) params.append('status_id', String(filters.status_id));
    if (filters?.type_id) params.append('type_id', String(filters.type_id));
    const query = params.toString() ? `?${params.toString()}` : '';
    tasks.value = await apiFetch(`/maintenance/tasks${query}`);
  }

  async function createTask(data: any) {
    return await apiFetch('/maintenance/tasks', { method: 'POST', body: JSON.stringify(data) });
  }

  async function updateTask(id: string, data: any) {
    return await apiFetch(`/maintenance/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async function deleteTask(id: string) {
    await apiFetch(`/maintenance/tasks/${id}`, { method: 'DELETE' });
  }

  async function generatePlan(startDate: string, endDate: string, nodeIds?: string[]) {
    return await apiFetch('/maintenance/plans/generate', {
      method: 'POST',
      body: JSON.stringify({ start_date: startDate, end_date: endDate, node_ids: nodeIds }),
    });
  }

  return {
    plans,
    tasks,
    isLoading,
    fetchPlans,
    fetchPlanById,
    createPlan,
    updatePlan,
    deletePlan,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    generatePlan,
  };
});