import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

const USE_MOCK = false;
const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');

function unwrapResponse<T = any>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

function asArray<T = any>(payload: any): T[] {
  const data = unwrapResponse<T[]>(payload);
  return Array.isArray(data) ? data : [];
}

function getUserId(): string | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return user.user_id || user.id || null;
  } catch {
    return null;
  }
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.headers) {
    const optsHeaders = options.headers as Record<string, string>;
    Object.keys(optsHeaders).forEach((key) => {
      const value = optsHeaders[key];
      if (value !== undefined) headers[key] = value;
    });
  }

  const userId = getUserId();
  if (userId) headers['x-user-id'] = userId;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let errorMsg = `Ошибка ${response.status}`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  if (response.status === 204) return null;
  return unwrapResponse(await response.json());
}

const mockNodes: any[] = [
  {
    node_id: 'mock-agg-1',
    name: 'Test aggregate',
    manufacturer: 'Demo',
    model: 'A-1',
    status: 'исправен',
    location: 'Demo location',
    parameters: {},
    installed_in_node: null,
    is_si: false,
    type: 'aggregate',
  },
  {
    node_id: 'mock-block-1',
    name: 'Test block',
    manufacturer: 'Demo',
    model: 'B-1',
    status: 'исправен',
    location: 'Demo location',
    parameters: {},
    installed_in_node: 'mock-agg-1',
    is_si: true,
    type: 'block',
  },
];

const mockNodeTypes: any[] = [
  { node_type_id: 'type1', name: 'Aggregate', parameters: {} },
  { node_type_id: 'type2', name: 'Block', parameters: {} },
];

export const useEquipmentStore = defineStore('equipment', () => {
  const rawNodes = ref<any[]>([]);
  const nodeTypes = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filterParams = ref({ search: '', status: '' });
  let initPromise: Promise<void> | null = null;

  const filteredNodes = computed(() => {
    let list = rawNodes.value;
    const { search, status } = filterParams.value;

    if (search) {
      const query = search.toLowerCase();
      list = list.filter((node: any) =>
        node.name?.toLowerCase().includes(query) ||
        node.manufacturer?.toLowerCase().includes(query) ||
        node.model?.toLowerCase().includes(query) ||
        node.serial_number?.toLowerCase().includes(query) ||
        node.inventory_number?.toLowerCase().includes(query) ||
        node.registration_number?.toLowerCase().includes(query)
      );
    }

    if (status) {
      list = list.filter((node: any) => node.status === status);
    }

    return list;
  });

  const allNodes = computed(() => rawNodes.value);

  async function fetchNodeTypes(force = true) {
    if (USE_MOCK) {
      nodeTypes.value = mockNodeTypes;
      return nodeTypes.value;
    }

    if (!force && nodeTypes.value.length > 0) return nodeTypes.value;

    try {
      nodeTypes.value = asArray(await apiFetch('/node-types'));
      error.value = null;
      return nodeTypes.value;
    } catch (err: any) {
      error.value = err.message;
      nodeTypes.value = [];
      throw err;
    }
  }

  async function fetchNodes(force = true) {
    if (!force && rawNodes.value.length > 0) return rawNodes.value;

    loading.value = true;

    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      rawNodes.value = [...mockNodes];
      loading.value = false;
      return rawNodes.value;
    }

    try {
      rawNodes.value = asArray(await apiFetch('/nodes'));
      error.value = null;
      return rawNodes.value;
    } catch (err: any) {
      error.value = err.message;
      rawNodes.value = [];
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function ensureNodesLoaded() {
    return await fetchNodes(false);
  }

  async function getNode(id: string) {
    if (USE_MOCK) return rawNodes.value.find((node) => node.node_id === id) || null;

    let node = rawNodes.value.find((item) => item.node_id === id);
    if (node) return node;

    try {
      node = await apiFetch(`/nodes/${id}`);
      if (node) rawNodes.value.push(node);
      error.value = null;
      return node;
    } catch (err: any) {
      error.value = err.message;
      return null;
    }
  }

  async function addNode(data: any) {
    loading.value = true;

    if (USE_MOCK) {
      const newNode = { ...data, node_id: `mock-${Date.now()}` };
      rawNodes.value.push(newNode);
      loading.value = false;
      return newNode;
    }

    try {
      const created = await apiFetch('/nodes', { method: 'POST', body: JSON.stringify(data) });
      await fetchNodes(true);
      return created;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateNode(id: string, data: any) {
    loading.value = true;

    if (USE_MOCK) {
      const idx = rawNodes.value.findIndex((node) => node.node_id === id);
      if (idx !== -1) rawNodes.value[idx] = { ...rawNodes.value[idx], ...data };
      loading.value = false;
      return rawNodes.value[idx] || null;
    }

    try {
      const updated = await apiFetch(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      await fetchNodes(true);
      return updated;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteNode(id: string) {
    loading.value = true;

    if (USE_MOCK) {
      rawNodes.value = rawNodes.value.filter((node) => node.node_id !== id);
      loading.value = false;
      return;
    }

    try {
      await apiFetch(`/nodes/${id}/write-off`, { method: 'DELETE' });
      await fetchNodes(true);
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addChild(parentId: string, childId: string) {
    await apiFetch(`/nodes/${parentId}/install/${childId}`, { method: 'POST' });
    await fetchNodes(true);
  }

  async function removeChild(parentId: string, childId: string) {
    await apiFetch(`/nodes/${childId}/uninstall`, { method: 'DELETE' });
    await fetchNodes(true);
  }

  async function getResourcesForNode(nodeId: string) {
    if (USE_MOCK) return [];
    try {
      return asArray(await apiFetch(`/resources/by-node/${nodeId}`));
    } catch {
      return [];
    }
  }

  async function addResource(data: any) {
    if (USE_MOCK) return;
    loading.value = true;
    try {
      return await apiFetch('/resources', { method: 'POST', body: JSON.stringify(data) });
    } finally {
      loading.value = false;
    }
  }

  async function updateResource(nodeId: string, resourceParams: any, note?: string) {
    if (USE_MOCK) return;
    loading.value = true;
    try {
      return await apiFetch(`/resources/${nodeId}`, {
        method: 'PUT',
        body: JSON.stringify({ resource_params: resourceParams, note }),
      });
    } finally {
      loading.value = false;
    }
  }

  async function deleteResource(nodeId: string) {
    if (USE_MOCK) return;
    loading.value = true;
    try {
      return await apiFetch(`/resources/${nodeId}`, { method: 'DELETE' });
    } finally {
      loading.value = false;
    }
  }

  async function getMoveHistoryForNode(nodeId: string) {
    if (USE_MOCK) return [];
    try {
      return asArray(await apiFetch(`/nodes/${nodeId}/movement-history`));
    } catch {
      return [];
    }
  }

  async function addMoveRecord(nodeId: string, fromLocation: string, toLocation: string) {
    await updateNode(nodeId, { location: toLocation });
  }

  function setFilterParams(params: Partial<typeof filterParams.value>) {
    filterParams.value = { ...filterParams.value, ...params };
  }

  async function init(force = false) {
    if (initPromise && !force) return initPromise;

    initPromise = Promise.all([
      fetchNodeTypes(force),
      fetchNodes(force),
    ]).then(() => undefined).finally(() => {
      initPromise = null;
    });

    return initPromise;
  }

  void init(false).catch(() => {});

  return {
    rawNodes,
    nodes: filteredNodes,
    allNodes,
    nodeTypes,
    loading,
    error,
    init,
    fetchNodes,
    ensureNodesLoaded,
    fetchNodeTypes,
    getNode,
    addNode,
    updateNode,
    deleteNode,
    addChild,
    removeChild,
    getResourcesForNode,
    addResource,
    updateResource,
    deleteResource,
    getMoveHistoryForNode,
    addMoveRecord,
    setFilterParams,
  };
});
