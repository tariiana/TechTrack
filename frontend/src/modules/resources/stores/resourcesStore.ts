import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

// Определение интерфейса для измерения
interface ResourceMeasurement {
  id: number;
  resourceId: number;
  nodeId: number;
  nodeName?: string;
  resourceName?: string;
  mark?: string;
  registrationNumber?: number;
  measurementDate: string;
  parameters: Record<string, any>;
  createdAt: string;
}

export const useResourcesStore = defineStore('resources', () => {
  const resources = ref<any[]>([]);
  const measurements = ref<ResourceMeasurement[]>([]);
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
      
      // Загружаем измерения из ресурсов
      loadMeasurementsFromResources();
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  // Извлечение измерений из ресурсов
  function loadMeasurementsFromResources() {
    const allMeasurements: ResourceMeasurement[] = [];
    for (const res of resources.value) {
      const measurementsList = res.resource_params?.measurements || [];
      for (const m of measurementsList) {
        allMeasurements.push({
          id: m.id,
          resourceId: res.id,
          nodeId: res.nodeId,
          nodeName: res.nodeName,
          resourceName: res.name,
          mark: res.mark,
          registrationNumber: res.registrationNumber,
          measurementDate: m.measurement_date,
          parameters: m.parameters || {},
          createdAt: m.created_at || new Date().toISOString(),
        });
      }
    }
    measurements.value = allMeasurements;
  }

  async function fetchResourceById(id: string) {
    const response = await apiFetch(`/resources/${id}`);
  const data = response.data || response;
  return data;
  }

  async function fetchResourcesForNode(nodeId: string) {
    return await fetchResources({ node_id: nodeId });
  }

  async function upsertResource(nodeId: string, data: any) {
    const response = await apiFetch(`/resources/${nodeId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await fetchResources();
    return response.data || response;
  }

  async function deleteResource(nodeId: string) {
    await apiFetch(`/resources/${nodeId}`, { method: 'DELETE' });
    await fetchResources();
  }

  async function calculateResource(nodeId: string, workHoursPerYear: number) {
    const response = await apiFetch(`/resources/${nodeId}/calculate`, {
      method: 'POST',
      body: JSON.stringify({ work_hours_per_year: workHoursPerYear })
    });
    return response.data || response;
  }

  // ========== Измерения (журнал) ==========
  function getMeasurementsForResource(resourceId: number): ResourceMeasurement[] {
    return measurements.value.filter((m: ResourceMeasurement) => m.resourceId === resourceId).sort((a: ResourceMeasurement, b: ResourceMeasurement) =>
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }

  // Получить параметры ресурса
  function getParametersForResource(resourceId: number): any[] {
    const resource = resources.value.find((r: any) => r.id === resourceId);
    if (!resource || !resource.resource_params) return [];
    const params = resource.resource_params;
    const result: any[] = [];
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'measurements') {
        const v = value as any;
        result.push({
          id: key,
          name: key,
          value: v.value !== undefined ? v.value : v,
          unit: v.unit || '',
          isMain: v.is_main || false,
        });
      }
    }
    return result;
  }

  // Обновить ресурс
  async function updateResource(id: number, data: any) {
    const resource = resources.value.find((r: any) => r.id === id);
    if (!resource) return;
    await upsertResource(String(resource.nodeId), data);
  }

  return {
    resources,
    measurements,
    isLoading,
    error,
    fetchResources,
    fetchResourceById,
    fetchResourcesForNode,
    upsertResource,
    deleteResource,
    calculateResource,
    getMeasurementsForResource,
    getParametersForResource,
    updateResource,
  };
});