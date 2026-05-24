import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

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
    node_id: String(resource?.node_id ?? resource?.nodeId ?? resource?.resource_id ?? ''),
    nodeId: String(resource?.nodeId ?? resource?.node_id ?? resource?.resource_id ?? ''),
    nodeName: resource?.nodeName ?? resource?.node_name,
    name: resource?.name || '',
    mark: resource?.mark || '',
    type: resource?.type || '',
    production_date: resource?.production_date || '',
    registration_date: resource?.registration_date || '',
    registration_number: registrationNumber,
    registrationNumber,
    last_service_date: resource?.last_service_date || '',
    service_life: resource?.service_life,
    time_to_service: resource?.time_to_service,
    initial_resource: toNumber(initial) ?? initial ?? '',
    remaining_resource: remainingNumber,
    installed_in: resource?.installed_in || '',
    location: resource?.location || '',
    status: resource?.status || (resource?.valid_to ? 'Списан' : 'Получен'),
    note: resource?.note || '',
    is_deleted: resource?.is_deleted || false,
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
      loadMeasurementsFromResources();
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  function loadMeasurementsFromResources() {
    const allMeasurements: ResourceMeasurement[] = [];
    for (const res of resources.value) {
      const measurementsList = Array.isArray(res.resource_params?.measurements)
        ? res.resource_params.measurements
        : [];
      for (const m of measurementsList) {
        allMeasurements.push({
          id: m.id,
          resourceId: String(res.resource_id),
          nodeId: String(res.node_id),
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
    const payload = { ...data, node_id: nodeId };
    const response = await apiFetch(`/resources/${nodeId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchResources();
    return response.data || response;
  }

  async function writeOffResource(nodeId: string) {
    await apiFetch(`/resources/${nodeId}`, { method: 'DELETE' });
    await fetchResources();
  }

  async function deleteResource(nodeId: string) {
    await writeOffResource(nodeId);
  }

  async function calculateResource(nodeId: string, workHoursPerYear: number) {
    const response = await apiFetch(`/resources/${nodeId}/calculate`, {
      method: 'POST',
      body: JSON.stringify({ work_hours_per_year: workHoursPerYear }),
    });
    return response.data || response;
  }

  function getMeasurementsForResource(resourceId: number | string): ResourceMeasurement[] {
    return measurements.value
      .filter((m: ResourceMeasurement) => String(m.resourceId) === String(resourceId))
      .sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
  }

  function getParametersForResource(resourceId: number | string): any[] {
    const resource = resources.value.find((r: any) => String(r.resource_id) === String(resourceId));
    if (!resource || !resource.resource_params) return [];
    const result: any[] = [];
    for (const [key, value] of Object.entries(resource.resource_params)) {
      if (key === 'measurements') continue;
      const v = value as any;
      result.push({
        id: key,
        name: key,
        value: v && typeof v === 'object' && 'value' in v ? v.value : v,
        unit: v && typeof v === 'object' ? v.unit || '' : '',
        isMain: v && typeof v === 'object' ? v.is_main || v.isMain || false : false,
      });
    }
    return result;
  }

  async function updateResource(id: number | string, data: any) {
    const resource = resources.value.find((r: any) => String(r.resource_id) === String(id));
    if (!resource) return;
    await upsertResource(String(resource.node_id), data);
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
    writeOffResource,
    calculateResource,
    getMeasurementsForResource,
    getParametersForResource,
    updateResource,
  };
});
