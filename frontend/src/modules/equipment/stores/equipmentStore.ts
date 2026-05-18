import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '@/api/client';

export const useEquipmentStore = defineStore('equipment', () => {
  const nodes = ref<any[]>([]);
  const tree = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const filterParams = ref({ search: '', status: '', subsystem_id: '', node_type_id: '' });

  async function fetchNodes() {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (filterParams.value.search) params.append('search', filterParams.value.search);
      if (filterParams.value.status) params.append('status', filterParams.value.status);
      if (filterParams.value.subsystem_id) params.append('subsystem_id', filterParams.value.subsystem_id);
      if (filterParams.value.node_type_id) params.append('node_type_id', filterParams.value.node_type_id);
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiFetch(`/nodes${query}`);
      nodes.value = data;
    } catch (err: any) {
      error.value = err.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchTree() {
    try {
      const data = await apiFetch('/nodes/tree');
      tree.value = data;
    } catch (err: any) {
      console.error(err);
    }
  }

  async function fetchNodeById(id: string) {
    return await apiFetch(`/nodes/${id}`);
  }

  async function fetchNodeChildren(id: string) {
    return await apiFetch(`/nodes/${id}/children`);
  }

  async function fetchMovementHistory(id: string) {
    return await apiFetch(`/nodes/${id}/movement-history`);
  }

  async function createNode(nodeData: any) {
    const newItem = await apiFetch('/nodes', { method: 'POST', body: JSON.stringify(nodeData) });
    await fetchNodes();
    return newItem;
  }

  async function updateNode(id: string, nodeData: any) {
    const updated = await apiFetch(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(nodeData) });
    await fetchNodes();
    return updated;
  }

  async function writeOffNode(id: string) {
    await apiFetch(`/nodes/${id}/write-off`, { method: 'DELETE' });
    await fetchNodes();
  }

  function setFilterParams(params: any) {
    filterParams.value = { ...filterParams.value, ...params };
    fetchNodes();
  }

  return {
    nodes,
    tree,
    isLoading,
    error,
    filterParams,
    fetchNodes,
    fetchTree,
    fetchNodeById,
    fetchNodeChildren,
    fetchMovementHistory,
    createNode,
    updateNode,
    writeOffNode,
    setFilterParams,
  };
});