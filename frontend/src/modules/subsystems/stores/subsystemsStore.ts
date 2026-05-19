import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiFetch } from '@/api/client';
import { useSIStore } from '@/modules/si/stores/siStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';
import { useResourcesStore } from '@/modules/resources/stores/resourcesStore';
import { useMaintenanceStore } from '@/modules/maintenance/stores/maintenanceStore';

export const useSubsystemStore = defineStore('subsystem', () => {
  const subsystems = ref<any[]>([]);
  const tree = ref<any[]>([]);
  const isLoading = ref(false);

  // Модули и их иконки
  const modules = [
    { id: 'si', name: 'Средства измерения', icon: '📏' },
    { id: 'equipment', name: 'Оборудование', icon: '🖥️' },
    { id: 'resources', name: 'Ресурсы', icon: '⚡' },
    { id: 'maintenance', name: 'Обслуживание', icon: '🔧' },
  ];

  // Получение содержимого для подсистемы по типу модуля (автоматически из других модулей)
  function getModuleContent(subsystemId: number, moduleId: string): any[] {
    const content: any[] = [];

    switch (moduleId) {
      case 'si': // Средства измерения
        const siStore = useSIStore();
        const siList = siStore.instruments.filter((si: any) => si.subsystem_id === subsystemId);
        siList.forEach((si: any) => {
          content.push({
            id: `si_${si.instrument_id}`,
            entityId: si.instrument_id,
            name: si.name,
            type: 'si',
            status: si.status,
          });
        });
        break;

      case 'equipment': // Оборудование
        const equipmentStore = useEquipmentStore();
        const eqList = equipmentStore.nodes.filter((eq: any) => eq.subsystem_id === subsystemId);
        eqList.forEach((eq: any) => {
          content.push({
            id: `equipment_${eq.node_id}`,
            entityId: eq.node_id,
            name: eq.name,
            type: 'equipment',
            status: eq.is_deleted ? 'списано' : 'активно',
          });
        });
        break;

      case 'resources': // Ресурсы
        const resourcesStore = useResourcesStore();
        const resList = resourcesStore.resources.filter((res: any) => res.subsystem_id === subsystemId);
        resList.forEach((res: any) => {
          content.push({
            id: `resource_${res.resource_id}`,
            entityId: res.resource_id,
            name: res.name,
            type: 'resource',
          });
        });
        break;

      case 'maintenance': // Планы ТО
        const maintenanceStore = useMaintenanceStore();
        const planList = maintenanceStore.plans.filter((plan: any) => plan.subsystem_id === subsystemId);
        planList.forEach((plan: any) => {
          content.push({
            id: `maintenance_${plan.plan_id}`,
            entityId: plan.plan_id,
            name: plan.name,
            type: 'maintenance',
            status: plan.status,
          });
        });
        break;
    }

    return content;
  }

  // Построение дерева: Подсистема → Модули → Содержимое
  const treeWithContent = computed(() => {
    const build = (nodes: any[]): any[] => {
      return nodes.map((s: any) => ({
        id: s.subsys_id,
        name: s.name,
        type: 'subsystem',
        children: [
          ...build(s.children || []),
          ...modules.map(module => ({
            id: `module_${module.id}_${s.subsys_id}`,
            name: module.name,
            icon: module.icon,
            type: 'module',
            moduleId: module.id,
            subsystemId: s.subsys_id,
            children: getModuleContent(s.subsys_id, module.id).map(content => ({
              id: content.id,
              name: content.name,
              type: 'content',
              contentType: content.type,
              entityId: content.entityId,
              status: content.status,
            })),
          })),
        ],
      }));
    };
    return build(tree.value);
  });

  async function fetchTree() {
    isLoading.value = true;
    try {
      tree.value = await apiFetch('/subsystems/tree');
    } catch (err) {
      console.error('Ошибка загрузки дерева:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAll() {
    try {
      subsystems.value = await apiFetch('/subsystems');
    } catch (err) {
      console.error('Ошибка загрузки подсистем:', err);
    }
  }

  async function getSubsystem(id: number) {
    return await apiFetch(`/subsystems/${id}`);
  }

  async function create(data: any) {
    const newItem = await apiFetch('/subsystems', { method: 'POST', body: JSON.stringify(data) });
    await fetchTree();
    return newItem;
  }

  async function update(id: number, data: any) {
    const updated = await apiFetch(`/subsystems/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    await fetchTree();
    return updated;
  }

  async function remove(id: number) {
    await apiFetch(`/subsystems/${id}`, { method: 'DELETE' });
    await fetchTree();
  }

  return {
    subsystems,
    tree: treeWithContent,
    rawTree: tree,
    modules,
    isLoading,
    fetchTree,
    fetchAll,
    getSubsystem,
    create,
    update,
    remove,
  };
});