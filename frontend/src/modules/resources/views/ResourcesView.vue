<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Ресурсы оборудования</h2>
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="openMeasurementsModal">📊 Журнал измерений</button>
        <button class="btn btn-secondary" @click="openCalculateModal">🔄 Авторасчёт</button>
        <button v-if="canEdit" class="btn btn-primary" @click="openForm">+ Добавить ресурс</button>
      </div>
    </div>

    <!-- Панель фильтров -->
    <div class="filter-panel">
      <div class="filter-row">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Поиск по наименованию..."
          class="form-control"
          style="width: 250px"
          @input="applyFilters"
        />
        <select v-model="filters.node_id" class="form-control" style="width: 200px" @change="applyFilters">
          <option value="">Все узлы</option>
          <option v-for="node in nodes" :key="node.node_id" :value="node.node_id">{{ node.name }}</option>
        </select>
        <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
      </div>
    </div>

    <!-- Таблица ресурсов с прокруткой -->
    <div class="table-scroll-container">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('name')">Наименование</th>
            <th @click="sortBy('mark')">Марка</th>
            <th @click="sortBy('registration_number')">Учётный №</th>
            <th @click="sortBy('initial_resource')">Исходный ресурс</th>
            <th @click="sortBy('remaining_resource')">Остаточный ресурс</th>
            <th @click="sortBy('installed_in')">Установлен в</th>
            <th @click="sortBy('location')">Размещение</th>
            <th @click="sortBy('note')">Примечание</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="res in store.resources" :key="res.resource_id" :class="getRowClass(res)">
            <td v-for="col in tableColumns" :key="col.key">{{ formatCell(res, col.key) }}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-secondary" @click="viewCard(res.resource_id)">Открыть</button>
              <button v-if="canEdit" class="btn btn-sm btn-secondary" @click="editResource(res)">✏️</button>
              <button v-if="canEdit" class="btn btn-sm btn-danger" @click="deleteResource(res.resource_id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="store.resources.length === 0">
            <td colspan="9" class="empty-data">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ResourceForm ref="formRef" @saved="refresh" />
    <AutoCalculateModal ref="calcModalRef" @calculated="onCalculated" />
    <MeasurementsModal ref="measurementsModalRef" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';
import ResourceForm from '../components/ResourceForm.vue';
import AutoCalculateModal from '../components/AutoCalculateModal.vue';
import MeasurementsModal from '../components/MeasurementsModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const router = useRouter();
const store = useResourcesStore();
const equipmentStore = useEquipmentStore();
const formRef = ref();
const calcModalRef = ref();
const measurementsModalRef = ref();
const confirmDialog = ref();

const filters = ref({ search: '', node_id: '' });
const nodes = ref<any[]>([]);
const sortField = ref('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

const tableColumns = [
  { key: 'name', label: 'Наименование' },
  { key: 'mark', label: 'Марка' },
  { key: 'registration_number', label: 'Учётный №' },
  { key: 'initial_resource', label: 'Исходный ресурс' },
  { key: 'remaining_resource', label: 'Остаточный ресурс' },
  { key: 'installed_in', label: 'Установлен в' },
  { key: 'location', label: 'Размещение' },
  { key: 'note', label: 'Примечание' },
];

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

function formatCell(res: any, key: string): string {
  const value = res[key];
  if (value === undefined || value === null) return '-';
  if (key === 'initial_resource' || key === 'remaining_resource') {
    return `${value}%`;
  }
  return String(value);
}

function getRowClass(res: any): string {
  const remaining = res.remaining_resource;
  if (remaining !== undefined && remaining <= 20) return 'row-critical';
  if (remaining !== undefined && remaining <= 50) return 'row-warning';
  return '';
}

function sortBy(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
  applyFilters();
}

function applyFilters() {
  store.fetchResources(filters.value);
}

function resetFilters() {
  filters.value = { search: '', node_id: '' };
  sortField.value = 'name';
  sortOrder.value = 'asc';
  applyFilters();
}

function openForm() { formRef.value?.open(); }
function editResource(res: any) { formRef.value?.open(res); }
function openCalculateModal() { calcModalRef.value?.open(); }
function openMeasurementsModal() { measurementsModalRef.value?.open(); }
async function deleteResource(id: string) {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить ресурс?');
  if (ok) await store.deleteResource(id);
}
function viewCard(id: string) { router.push(`/resources/${id}`); }
function refresh() { applyFilters(); }
function onCalculated(result: { count: number }) {
  alert(`Рассчитано ресурсов: ${result.count}`);
  refresh();
}

async function loadNodes() {
  await equipmentStore.fetchNodes();
  nodes.value = equipmentStore.nodes;
}

onMounted(() => {
  loadNodes();
  store.fetchResources();
});
</script>

<style scoped>
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.filter-panel {
  background: #f8f9fa;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.filter-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.row-critical { background-color: #ffe0e0; }
.row-warning { background-color: #fff3e0; }
.actions-cell { white-space: nowrap; }
.actions-cell .btn { margin-right: 4px; }
.empty-data { text-align: center; padding: 20px; color: #999; }

/* Контейнер для таблицы с прокруткой */
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 500px;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  background: white;
}

.table-scroll-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: #e0e4e8;
  border-radius: 6px;
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: #2c5f8a;
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #1e4566;
}

/* Стили для таблицы внутри контейнера */
.table-scroll-container .data-table {
  min-width: 800px;
}
</style>