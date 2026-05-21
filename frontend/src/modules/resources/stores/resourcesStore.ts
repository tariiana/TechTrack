import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

// Определение интерфейса для измерения
interface ResourceMeasurement {
  id: number | string;
  resourceId: string;
  nodeId: string;
  nodeName?: string;
  resourceName?: string;
  mark?: string;
  registrationNumber?: number | string;
  measurementDate: string;
  parameters: Record<string, any>;
  createdAt: string;
}

function isBlank(value: any): boolean {
  return value === null || value === undefined || value === '';
}

function readParam(params: Record<string, any>, key: string): any {
  const value = params?.[key];
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return value.value;
  }
  return value;
}

function firstPresent(...values: any[]): any {
  return values.find(value => !isBlank(value));
}

function toNumber(value: any): number | null {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const result = Number(match[0]);
  return Number.isFinite(result) ? result : null;
}

function normalizeResource(resource: any): any {
  const params = resource?.resource_params || {};
  const remaining = firstPresent(
    resource?.remaining_resource,
    readParam(params, 'remaining_resource'),
    readParam(params, 'remaining_life'),
    readParam(params, 'remainingLife'),
    readParam(params, 'health'),
    readParam(params, 'battery_level')
  );
  const remainingNumber = toNumber(remaining);
  const initial = firstPresent(
    resource?.initial_resource,
    readParam(params, 'initial_resource'),
    readParam(params, 'initial_life'),
    readParam(params, 'initialLife'),
    remainingNumber !== null ? 100 : null
  );
  const registrationNumber = firstPresent(
    resource?.registration_number,
    resource?.registrationNumber,
    readParam(params, 'registration_number'),
    resource?.inventory_number
  );

  return {
    ...resource,
    id: String(resource?.id ?? resource?.resource_id ?? resource?.node_id ?? ''),
    resource_id: String(resource?.resource_id ?? resource?.id ?? resource?.node_id ?? ''),
    node_id: String(resource?.node_id ?? resource?.nodeId ?? ''),
    nodeId: String(resource?.nodeId ?? resource?.node_id ?? ''),
    nodeName: resource?.nodeName ?? resource?.node_name,
    registration_number: registrationNumber,
    registrationNumber,
    initial_resource: toNumber(initial) ?? initial,
    remaining_resource: remainingNumber,
    resource_params: {
      ...params,
      measurements: Array.isArray(params.measurements) ? params.measurements : [],
    },
  };
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
      const data = response.data || response;
      resources.value = Array.isArray(data) ? data.map(normalizeResource) : [];
      
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
      const measurementsList = Array.isArray(res.resource_params?.measurements)
        ? res.resource_params.measurements
        : [];
      for (const m of measurementsList) {
        allMeasurements.push({
          id: m.id,
          resourceId: String(res.resource_id ?? res.id),
          nodeId: String(res.node_id ?? res.nodeId),
          nodeName: res.nodeName ?? res.node_name,
          resourceName: res.name,
          mark: res.mark,
          registrationNumber: res.registrationNumber ?? res.registration_number,
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
    const normalized = normalizeResource(data);
    const index = resources.value.findIndex((resource: any) => String(resource.resource_id) === String(normalized.resource_id));
    if (index >= 0) resources.value[index] = normalized;
    else resources.value.push(normalized);
    loadMeasurementsFromResources();
    return normalized;
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
  function getMeasurementsForResource(resourceId: number | string): ResourceMeasurement[] {
    return measurements.value.filter((m: ResourceMeasurement) => String(m.resourceId) === String(resourceId)).sort((a: ResourceMeasurement, b: ResourceMeasurement) =>
      new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }

  // Получить параметры ресурса
  function getParametersForResource(resourceId: number | string): any[] {
    const resource = resources.value.find((r: any) => String(r.id) === String(resourceId));
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
  async function updateResource(id: number | string, data: any) {
    const resource = resources.value.find((r: any) => String(r.id) === String(id));
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
