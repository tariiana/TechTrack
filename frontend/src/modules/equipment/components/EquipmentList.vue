<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
      <h2>Оборудование</h2>
      <div class="action-buttons">
        <button v-if="canEdit" class="btn btn-primary btn-fixed" @click="openForm">+ Добавить</button>
        <button class="btn btn-secondary btn-fixed" @click="exportToExcel">📎 Excel</button>
        <button class="btn btn-secondary btn-fixed" @click="exportToWord">📄 Word</button>
        <button class="btn btn-secondary btn-fixed" @click="openAdvancedFilter">🔍 Расш. фильтр</button>
      </div>
    </div>

    <!-- Панель быстрых фильтров -->
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px">
      <input
        v-model="quickFilters.search"
        type="text"
        placeholder="Поиск по наименованию, производителю, марке..."
        class="form-control"
        style="width: 300px"
        @input="applyQuickFilters"
      />
      <select v-model="quickFilters.status" class="form-control" style="width: 150px" @change="applyQuickFilters">
        <option value="">Все статусы</option>
        <option value="получен">Получен</option>
        <option value="исправен">Исправен</option>
        <option value="неисправен">Неисправен</option>
        <option value="в ремонте">В ремонте</option>
        <option value="на поверке">На поверке</option>
        <option value="законсервирован">Законсервирован</option>
        <option value="списан">Списан</option>
      </select>
      <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
    </div>

    <!-- Контейнер для таблицы с прокруткой (только для таблицы) -->
    <div class="table-scroll-container">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('subsystem_name')">Подсистема</th>
            <th @click="sortBy('name')">Наименование</th>
            <th @click="sortBy('parent_name')">Установлено в</th>
            <th @click="sortBy('manufacturer')">Производитель</th>
            <th @click="sortBy('model')">Марка</th>
            <th @click="sortBy('parameters')">Параметры</th>
            <th @click="sortBy('serial_number')">Зав. №</th>
            <th @click="sortBy('inventory_number')">Инв. №</th>
            <th @click="sortBy('is_si')">СИ</th>
            <th @click="sortBy('status')">Состояние</th>
            <th @click="sortBy('resource')">Ресурс</th>
            <th @click="sortBy('location')">Размещение</th>
            <th @click="sortBy('note')">Примечание</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in sortedNodes" :key="node.node_id" :class="{ 'disabled-row': node.status === 'списан' }">
            <td>{{ node.subsystem_name || '-' }}</td>
            <td>{{ node.name }}</td>
            <td>{{ node.parent_name || '-' }}</td>
            <td>{{ node.manufacturer || '-' }}</td>
            <td>{{ node.model || '-' }}</td>
            <td>{{ node.parameters || '-' }}</td>
            <td>{{ node.serial_number || '-' }}</td>
            <td>{{ node.inventory_number || '-' }}</td>
            <td>{{ node.is_si ? 'Да' : 'Нет' }}</td>
            <td>{{ node.status || '-' }}</td>
            <td>{{ node.resource || '-' }}</td>
            <td>{{ node.location || '-' }}</td>
            <td>{{ node.note || '-' }}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-secondary" @click="viewCard(node.node_id)">Просмотр</button>
              <button v-if="canEdit && node.status !== 'списан'" class="btn btn-sm btn-secondary" @click="editNode(node)">✏️</button>
              <button v-if="canEdit && node.status !== 'списан'" class="btn btn-sm btn-danger" @click="writeOffNode(node.node_id)">📝 Списать</button>
              <span v-if="node.status === 'списан'" class="badge-disabled">Списан</span>
            </td>
          </tr>
          <tr v-if="sortedNodes.length === 0">
            <td colspan="14" class="empty-data">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <EquipmentForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
    <AdvancedFilter ref="advancedFilterRef" @apply="applyAdvancedFilters" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import EquipmentForm from './EquipmentForm.vue';
import AdvancedFilter from './AdvancedFilter.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import * as exportUtils from '@/utils/exportUtils';

const router = useRouter();
const store = useEquipmentStore();
const formRef = ref();
const confirmDialog = ref();
const advancedFilterRef = ref();

const quickFilters = ref({ search: '', status: '' });
const advancedConditions = ref<any[]>([]);
const sortField = ref('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

const sortedNodes = computed(() => {
  let list = [...store.nodes];

  // Расширенные фильтры
  if (advancedConditions.value.length) {
    list = list.filter(node => {
      return advancedConditions.value.every(cond => {
        const val = (node as any)[cond.field];
        if (val === undefined) return false;
        switch (cond.operator) {
          case 'eq': return String(val).toLowerCase() === cond.value.toLowerCase();
          case 'contains': return String(val).toLowerCase().includes(cond.value.toLowerCase());
          case 'gt': return Number(val) > Number(cond.value);
          case 'lt': return Number(val) < Number(cond.value);
          default: return true;
        }
      });
    });
  }

  // Сортировка
  list.sort((a, b) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });

  return list;
});

function sortBy(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

function applyQuickFilters() {
  store.setFilterParams({
    search: quickFilters.value.search,
    status: quickFilters.value.status,
  });
}

function resetFilters() {
  quickFilters.value = { search: '', status: '' };
  advancedConditions.value = [];
  applyQuickFilters();
}

function openAdvancedFilter() {
  advancedFilterRef.value?.open();
}

function applyAdvancedFilters(conditions: any[]) {
  advancedConditions.value = conditions;
}

function viewCard(id: string) {
  router.push(`/equipment/${id}`);
}

function openForm() {
  formRef.value?.open();
}

function editNode(node: any) {
  formRef.value?.open(node);
}

async function writeOffNode(id: string) {
  const ok = await confirmDialog.value?.show('Списание', 'Списать узел?');
  if (ok) {
    await store.writeOffNode(id);
  }
}

function refresh() {
  store.fetchNodes();
}

// Экспорт
function getExportData() {
  return sortedNodes.value.map((node: any) => ({
    'Подсистема': node.subsystem_name || '-',
    'Наименование': node.name,
    'Установлено в': node.parent_name || '-',
    'Производитель': node.manufacturer || '-',
    'Марка': node.model || '-',
    'Параметры': node.parameters || '-',
    'Зав. №': node.serial_number || '-',
    'Инв. №': node.inventory_number || '-',
    'СИ': node.is_si ? 'Да' : 'Нет',
    'Состояние': node.status || '-',
    'Ресурс': node.resource || '-',
    'Размещение': node.location || '-',
    'Примечание': node.note || '-',
  }));
}

function exportToExcel() {
  const data = getExportData();
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  const filename = `Оборудование_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  exportUtils.exportToExcel(data, filename);
}

function exportToWord() {
  const data = getExportData();
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  const firstItem = data[0];
  if (!firstItem) return;
  const headers = Object.keys(firstItem);
  const filename = `Оборудование_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  exportUtils.exportToWord(data, headers, filename);
}

onMounted(() => {
  store.fetchNodes();
});
</script>

<style scoped>
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-fixed { min-width: 140px; text-align: center; }
.badge-disabled {
  display: inline-block;
  padding: 4px 8px;
  background-color: #e9ecef;
  color: #6c757d;
  border-radius: 4px;
  font-size: 12px;
}
.disabled-row {
  background-color: #f0f0f0;
  color: #999;
  opacity: 0.7;
}
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
</style>