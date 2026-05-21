import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiFetch } from '@/api/client';
import type {
  Subsystem,
  SubsystemNode,
  SubsystemPayload,
  SubsystemTreeItem,
  SubsystemTreeNode,
} from '../types/subsystemsTypes';

function toTreeNode(node: SubsystemTreeItem): SubsystemTreeNode {
  return {
    id: node.subsys_id,
    name: node.name,
    type: 'subsystem',
    children: (node.children || []).map(toTreeNode),
  };
}

export const useSubsystemStore = defineStore('subsystem', () => {
  const subsystems = ref<Subsystem[]>([]);
  const rawTree = ref<SubsystemTreeItem[]>([]);
  const isLoading = ref(false);
  const error = ref('');
  let fetchAllPromise: Promise<Subsystem[]> | null = null;
  let fetchTreePromise: Promise<SubsystemTreeItem[]> | null = null;

  const tree = computed<SubsystemTreeNode[]>(() => rawTree.value.map(toTreeNode));

  async function fetchTree(force = false) {
    if (!force && rawTree.value.length > 0) return rawTree.value;
    if (fetchTreePromise) return fetchTreePromise;

    isLoading.value = true;
    error.value = '';

    fetchTreePromise = (async () => {
      const data = await apiFetch('/subsystems/tree');
      rawTree.value = Array.isArray(data) ? data : [];
      return rawTree.value;
    })();

    try {
      return await fetchTreePromise;
    } catch (err: any) {
      console.error(err);
      rawTree.value = [];
      error.value = err.message || 'Не удалось загрузить дерево подсистем';
      return [];
    } finally {
      fetchTreePromise = null;
      isLoading.value = false;
    }
  }

  async function fetchAll(force = false) {
    if (!force && subsystems.value.length > 0) return subsystems.value;
    if (fetchAllPromise) return fetchAllPromise;

    error.value = '';

    fetchAllPromise = (async () => {
      const data = await apiFetch('/subsystems');
      subsystems.value = Array.isArray(data) ? data : [];
      return subsystems.value;
    })();

    try {
      return await fetchAllPromise;
    } catch (err: any) {
      console.error(err);
      subsystems.value = [];
      error.value = err.message || 'Не удалось загрузить подсистемы';
      return [];
    } finally {
      fetchAllPromise = null;
    }
  }

  async function getSubsystem(id: string): Promise<Subsystem> {
    return await apiFetch(`/subsystems/${id}`);
  }

  async function fetchNodes(id: string): Promise<SubsystemNode[]> {
    const data = await apiFetch(`/subsystems/${id}/nodes`);
    return Array.isArray(data) ? data : [];
  }

  async function create(data: SubsystemPayload) {
    const newItem = await apiFetch('/subsystems', { method: 'POST', body: JSON.stringify(data) });
    await Promise.all([fetchTree(true), fetchAll(true)]);
    return newItem as Subsystem;
  }

  async function update(id: string, data: SubsystemPayload) {
    const updated = await apiFetch(`/subsystems/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await Promise.all([fetchTree(true), fetchAll(true)]);
    return updated as Subsystem;
  }

  async function remove(id: string) {
    await apiFetch(`/subsystems/${id}`, { method: 'DELETE' });
    await Promise.all([fetchTree(true), fetchAll(true)]);
  }

  return {
    subsystems,
    tree,
    rawTree,
    isLoading,
    error,
    fetchTree,
    fetchAll,
    getSubsystem,
    fetchNodes,
    create,
    update,
    remove,
  };
});
