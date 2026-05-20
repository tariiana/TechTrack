import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/api/client';

export const useSubsystemStore = defineStore('subsystem', () => {
  const subsystems = ref<any[]>([]);
  const rawTree = ref<any[]>([]);
  const isLoading = ref(false);

  const tree = computed(() => {
    if (!rawTree.value || !Array.isArray(rawTree.value)) return [];
    const build = (nodes: any[]): any[] => {
      return nodes.map((node: any) => ({
        id: node.subsys_id,
        name: node.name,
        type: 'subsystem',
        children: build(node.children || []),
      }));
    };
    return build(rawTree.value);
  });

  async function fetchTree() {
    isLoading.value = true;
    try {
      const data = await apiFetch('/subsystems/tree');
      rawTree.value = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(err);
      rawTree.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAll() {
    try {
      const data = await apiFetch('/subsystems');
      subsystems.value = Array.isArray(data) ? data : [];
    } catch (err) {
      console.error(err);
      subsystems.value = [];
    }
  }

  async function getSubsystem(id: string) {
    return await apiFetch(`/subsystems/${id}`);
  }

  async function create(data: any) {
    const newItem = await apiFetch('/subsystems', { method: 'POST', body: JSON.stringify(data) });
    await fetchTree();
    await fetchAll();
    return newItem;
  }

  async function update(id: string, data: any) {
    const updated = await apiFetch(`/subsystems/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchTree();
    await fetchAll();
    return updated;
  }

  async function remove(id: string) {
    await apiFetch(`/subsystems/${id}`, { method: 'DELETE' });
    await fetchTree();
    await fetchAll();
  }

  return {
    subsystems,
    tree,
    rawTree,
    isLoading,
    fetchTree,
    fetchAll,
    getSubsystem,
    create,
    update,
    remove,
  };
});