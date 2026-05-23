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

function normalizeResource(resource: any): any {
  return {
    ...resource,
    resource_id: resource.resource_id || resource.id,
    node_id: resource.node_id || resource.nodeId,
    name: resource.name || '',
    mark: resource.mark || '',
    type: resource.type || '',
    production_date: resource.production_date || '',
    registration_date: resource.registration_date || '',
    registration_number: resource.registration_number,
    last_service_date: resource.last_service_date || '',
    service_life: resource.service_life,
    time_to_service: resource.time_to_service,
    initial_resource: resource.initial_resource || '',
    remaining_resource: resource.remaining_resource || '',
    installed_in: resource.installed_in || '',
    location: resource.location || '',
    status: resource.status || 'Получен',
    note: resource.note || '',
    is_deleted: resource.is_deleted || false,
    resource_params: resource.resource_params || {},
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
      const measurementsList = Array.isArray(res.resource_params?.measurements) ? res.resource_params.measurements : [];
      for (const m of measurementsList) {
        allMeasurements.push({
          id: m.id,
          resourceId: String(res.resource_id),
          nodeId: String(res.node_id),
          nodeName: res.node_name,
          resourceName: res.name,
          mark: res.mark,
          registrationNumber: res.registration_number,
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
    return normalizeResource(data);
  }

  async function fetchResourcesForNode(nodeId: string) {
    return await fetchResources({ node_id: nodeId });
  }

  async function upsertResource(nodeId: string, data: any) {
    const payload = {
      node_id: nodeId,
      name: data.name || '',
      mark: data.mark || '',
      type: data.type || '',
      production_date: data.production_date || '',
      registration_date: data.registration_date || new Date().toISOString().slice(0, 10),
      registration_number: data.registration_number,
      last_service_date: data.last_service_date || '',
      service_life: data.service_life,
      time_to_service: data.time_to_service,
      initial_resource: data.initial_resource || '',
      remaining_resource: data.remaining_resource || '',
      installed_in: data.installed_in || '',
      location: data.location || '',
      status: data.status || 'Получен',
      note: data.note || '',
      is_deleted: data.is_deleted || false,
      resource_params: data.resource_params || {},
    };
    const response = await apiFetch(`/resources/${nodeId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await fetchResources();
    return response.data || response;
  }

  async function writeOffResource(nodeId: string) {
    const resource = resources.value.find(r => r.node_id === nodeId);
    if (!resource) return;
    await upsertResource(nodeId, { 
      status: 'Списан',
      is_deleted: true 
    });
  }

  async function deleteResource(nodeId: string) {
    await writeOffResource(nodeId);
  }

  async function calculateResource(nodeId: string, workHoursPerYear: number) {
    const response = await apiFetch(`/resources/${nodeId}/calculate`, {
      method: 'POST',
      body: JSON.stringify({ work_hours_per_year: workHoursPerYear })
    });
    return response.data || response;
  }

  function getMeasurementsForResource(resourceId: number | string): ResourceMeasurement[] {
    return measurements.value.filter((m: ResourceMeasurement) => String(m.resourceId) === String(resourceId));
  }

  function getParametersForResource(resourceId: number | string): any[] {
    const resource = resources.value.find((r: any) => String(r.resource_id) === String(resourceId));
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