// src/modules/equipment/stores/equipmentStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const USE_MOCK = true; // ← включите для отображения тестовых данных

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function getUserId(): string | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    const user = JSON.parse(userStr);
    return user.user_id || user.id || null;
  } catch { return null; }
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.headers) {
    const optsHeaders = options.headers as Record<string, string>;
    Object.keys(optsHeaders).forEach(k => {
      const v = optsHeaders[k];
      if (v !== undefined) headers[k] = v;
    });
  }
  const userId = getUserId();
  if (userId) headers['x-user-id'] = userId;
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `Ошибка ${response.status}`;
    try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch {}
    throw new Error(errorMsg);
  }
  if (response.status === 204) return null;
  return await response.json();
}

// Мок-данные (1 агрегат, 1 блок)
const mockNodes = [
  {
    node_id: 'mock-agg-1',
    name: 'Пост контроля №9',
    manufacturer: 'НПП "Доза"',
    model: 'АСКРО-СЗЗиЗН-9',
    serial_number: 'АС-9-001',
    inventory_number: '7415523',
    status: 'исправен',
    location: 'ПП-1, пост контроля №9',
    parameters: { power: 150, weight: 45 },
    note: 'Основной пост',
    commission_date: '2023-02-01',
    operation_mode: 168,
    manufactured_date: '2023-01-15',
    write_off_date: null,
    subsystem_name: 'Измерительная подсистема',
    parent_name: null,
    installed_in_node: null,
    is_si: false,
    type: 'aggregate',
  },
  {
    node_id: 'mock-block-1',
    name: 'Блок детектирования №1',
    manufacturer: 'НПП "Доза"',
    model: 'ДБГ-С11Д',
    serial_number: '373',
    inventory_number: '7415525',
    status: 'исправен',
    location: 'ПП-1, пост контроля №9',
    parameters: { detector_type: 'сцинтилляционный NaI', sensitivity: 150 },
    note: 'В составе поста №9',
    commission_date: '2023-02-01',
    operation_mode: 168,
    manufactured_date: '2023-01-10',
    write_off_date: null,
    subsystem_name: 'Измерительная подсистема',
    parent_name: 'Пост контроля №9',
    installed_in_node: 'mock-agg-1',
    is_si: true,
    type: 'block',
  },
];

const mockNodeTypes = [
  { node_type_id: 'type1', name: 'Блок детектирования', parameters: { sensitivity: { value: '', unit: 'мкЗв/с', isMain: true } } },
  { node_type_id: 'type2', name: 'Маршрутизатор', parameters: { ports: { value: '', unit: 'шт', isMain: true } } },
];

export const useEquipmentStore = defineStore('equipment', () => {
  const rawNodes = ref<any[]>([]);
  const nodeTypes = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filterParams = ref({ search: '', status: '' });

  const filteredNodes = computed(() => {
    let list = rawNodes.value;
    const { search, status } = filterParams.value;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((n: any) =>
        n.name?.toLowerCase().includes(s) ||
        n.manufacturer?.toLowerCase().includes(s) ||
        n.model?.toLowerCase().includes(s)
      );
    }
    if (status) list = list.filter((n: any) => n.status === status);
    return list;
  });

  const allNodes = computed(() => rawNodes.value);

  async function fetchNodeTypes() {
    if (USE_MOCK) { nodeTypes.value = mockNodeTypes; return; }
    try { nodeTypes.value = await apiFetch('/node-types'); } catch {}
  }

  async function fetchNodes() {
    loading.value = true;
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      rawNodes.value = [...mockNodes];
      loading.value = false;
      return;
    }
    try { rawNodes.value = await apiFetch('/nodes'); } catch (err: any) { error.value = err.message; }
    finally { loading.value = false; }
  }

  async function getNode(id: string) {
    if (USE_MOCK) return rawNodes.value.find(n => n.node_id === id) || null;
    let node = rawNodes.value.find(n => n.node_id === id);
    if (node) return node;
    try { node = await apiFetch(`/nodes/${id}`); if (node) rawNodes.value.push(node); return node; } catch { return null; }
  }

  async function addNode(data: any) {
    loading.value = true;
    if (USE_MOCK) {
      const newNode = { ...data, node_id: `mock-${Date.now()}` };
      rawNodes.value.push(newNode);
      loading.value = false;
      return newNode;
    }
    try { await apiFetch('/nodes', { method: 'POST', body: JSON.stringify(data) }); await fetchNodes(); } catch (err: any) { error.value = err.message; throw err; }
    finally { loading.value = false; }
  }

  async function updateNode(id: string, data: any) {
    loading.value = true;
    if (USE_MOCK) {
      const idx = rawNodes.value.findIndex(n => n.node_id === id);
      if (idx !== -1) rawNodes.value[idx] = { ...rawNodes.value[idx], ...data };
      loading.value = false;
      return;
    }
    try { await apiFetch(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }); await fetchNodes(); } catch (err: any) { error.value = err.message; throw err; }
    finally { loading.value = false; }
  }

  async function deleteNode(id: string) {
    loading.value = true;
    if (USE_MOCK) { rawNodes.value = rawNodes.value.filter(n => n.node_id !== id); loading.value = false; return; }
    try { await apiFetch(`/nodes/${id}/write-off`, { method: 'DELETE' }); await fetchNodes(); } catch (err: any) { error.value = err.message; throw err; }
    finally { loading.value = false; }
  }

  async function addChild(parentId: string, childId: string) { await updateNode(childId, { installed_in_node: parentId }); }
  async function removeChild(parentId: string, childId: string) { await updateNode(childId, { installed_in_node: null }); }
  async function getResourcesForNode(nodeId: string) { if (USE_MOCK) return []; try { return await apiFetch(`/resources/by-node/${nodeId}`); } catch { return []; } }
  async function addResource(data: any) { if (USE_MOCK) return; loading.value = true; try { await apiFetch('/resources', { method: 'POST', body: JSON.stringify(data) }); } finally { loading.value = false; } }
  async function updateResource(nodeId: string, resourceParams: any, note?: string) { if (USE_MOCK) return; loading.value = true; try { await apiFetch(`/resources/${nodeId}`, { method: 'PUT', body: JSON.stringify({ resource_params: resourceParams, note }) }); } finally { loading.value = false; } }
  async function deleteResource(nodeId: string) { if (USE_MOCK) return; loading.value = true; try { await apiFetch(`/resources/${nodeId}`, { method: 'DELETE' }); } finally { loading.value = false; } }
  async function getMoveHistoryForNode(nodeId: string) { if (USE_MOCK) return []; try { return await apiFetch(`/nodes/${nodeId}/movement-history`); } catch { return []; } }
  async function addMoveRecord(nodeId: string, fromLocation: string, toLocation: string) { await updateNode(nodeId, { location: toLocation }); }

  function setFilterParams(params: Partial<typeof filterParams.value>) { filterParams.value = { ...filterParams.value, ...params }; }
  async function init() { await Promise.all([fetchNodeTypes(), fetchNodes()]); }

  return {
    nodes: filteredNodes,
    allNodes,
    nodeTypes,
    loading,
    error,
    init,
    fetchNodes,
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