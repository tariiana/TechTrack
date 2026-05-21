<template>
  <div class="card">
    <!-- Заголовок и кнопки -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Ресурсы оборудования</h2>
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="openMeasurementsModal">📊 Журнал измерений</button>
        <button class="btn btn-secondary" @click="openAddMeasurementModal">+ Добавить измерение параметра</button>
        <button class="btn btn-primary" @click="openForm">+ Добавить оборудование</button>
      </div>
    </div>

    <!-- Блок предупреждений (сворачиваемый) -->
    <div v-if="alerts.length" class="alert-panel">
      <div class="alert-header" @click="toggleAlerts">
        <h4>⚠️ Предупреждения</h4>
        <button class="btn-icon">{{ alertsCollapsed ? '▼' : '▲' }}</button>
      </div>
      <div v-if="!alertsCollapsed" class="alert-list">
        <div v-for="(alert, idx) in alerts" :key="idx" :class="['alert-item', alert.type]">
          {{ alert.message }}
        </div>
      </div>
    </div>

    <!-- Панель фильтрации (простой фильтр) -->
    <div class="filter-panel">
      <div class="filter-row">
        <input v-model="filters.search" type="text" placeholder="Поиск по наименованию, производитель..." class="form-control" style="width: 300px" @input="applyFilters" />
        <select v-model="filters.status" class="form-control" style="width: 180px" @change="applyFilters">
          <option value="">Все статусы</option>
          <option value="Получен">Получен</option>
          <option value="Исправен">Исправен</option>
          <option value="Неисправен">Неисправен</option>
          <option value="В ремонте">В ремонте</option>
          <option value="На поверке">На поверке</option>
          <option value="Законсервирован">Законсервирован</option>
          <option value="Списан">Списан</option>
        </select>
        <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
      </div>
      <button class="btn btn-link" @click="showAdvancedFilter = !showAdvancedFilter">Расширенный фильтр</button>
    </div>

    <!-- Расширенный фильтр -->
    <div v-if="showAdvancedFilter" class="advanced-filter-panel">
      <div class="filter-conditions">
        <div v-for="(cond, idx) in advancedFilters" :key="idx" class="filter-condition">
          <select v-model="cond.field" class="form-control">
            <option value="">-- Поле --</option>
            <option value="name">Наименование</option>
            <option value="mark">Марка</option>
            <option value="registration_number">Учётный №</option>
            <option value="installed_in">Установлен в</option>
            <option value="location">Размещение</option>
            <option value="status">Статус</option>
          </select>
          <select v-model="cond.operator" class="form-control">
            <option value="contains">Содержит</option>
            <option value="equals">Равно</option>
            <option value="starts">Начинается с</option>
            <option value="ends">Заканчивается на</option>
          </select>
          <input v-model="cond.value" type="text" placeholder="Значение" class="form-control" />
          <button class="btn btn-sm btn-danger" @click="removeFilterCondition(idx)">✖</button>
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn btn-sm btn-secondary" @click="addFilterCondition">+ Добавить условие</button>
        <button class="btn btn-sm btn-secondary" @click="resetAdvancedFilters">Сбросить</button>
        <button class="btn btn-sm btn-primary" @click="applyAdvancedFilters">Применить</button>
        <button class="btn btn-sm btn-secondary" @click="showAdvancedFilter = false">Закрыть</button>
      </div>
    </div>

    <!-- Кнопки управления таблицей -->
    <div class="table-toolbar">
      <button class="btn btn-secondary" @click="showColumnSettings = true">⚙️ Колонки</button>
      <div class="dropdown">
        <button class="btn btn-secondary" @click="toggleExportDropdown">📎 Экспорт</button>
        <div v-if="exportDropdownOpen" class="dropdown-menu">
          <button class="dropdown-item" @click="exportToExcel">Microsoft Excel (.xlsx)</button>
          <button class="dropdown-item" @click="exportToWord">Microsoft Word (.docx)</button>
        </div>
      </div>
    </div>
<div class="modal-overlay" v-if="showColumnSettings">
  <div class="modal-content" style="width: 450px;">
    <div class="modal-header">Настройка колонок</div>
    <div v-for="col in allColumns" :key="col.key" style="margin-bottom: 8px;">
      <label><input type="checkbox" v-model="selectedColumns" :value="col.key"> {{ col.label }}</label>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" @click="showColumnSettings = false">Закрыть</button>
    </div>
  </div>
</div>
    <!-- Таблица ресурсов -->
    <div class="table-scroll-container">
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="col in visibleColumns" :key="col.key" @click="sortBy(col.key)">
              {{ col.label }}
              <span v-if="sortField === col.key">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="res in sortedAndFilteredResources" :key="res.resource_id" :class="getRowClass(res)">
            <td v-for="col in visibleColumns" :key="col.key">{{ formatCell(res, col.key) }}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-secondary" @click="viewCard(res.resource_id)">Просмотр</button>
              <button v-if="canEdit" class="btn btn-sm btn-secondary" @click="editResource(res)">✏️</button>
              <button v-if="canEdit" class="btn btn-sm btn-danger" @click="deleteResource(res.resource_id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="sortedAndFilteredResources.length === 0">
            <td :colspan="visibleColumns.length + 1" class="empty-data">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Модальные окна -->
    <ResourceForm ref="formRef" @saved="refresh" />
    <AddMeasurementModal ref="addMeasurementModalRef" @saved="refresh" />
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
import AddMeasurementModal from '../components/AddMeasurementModal.vue';
import MeasurementsModal from '../components/MeasurementsModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import * as exportUtils from '@/utils/exportUtils';

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const result = Number(match[0]);
  return Number.isFinite(result) ? result : null;
}

const router = useRouter();
const store = useResourcesStore();
const equipmentStore = useEquipmentStore();
const formRef = ref();
const addMeasurementModalRef = ref();
const measurementsModalRef = ref();
const confirmDialog = ref();

// Фильтры
const filters = ref({ search: '', status: '' });
const advancedFilters = ref<{ field: string; operator: string; value: string }[]>([]);
const showAdvancedFilter = ref(false);
const nodes = ref<any[]>([]);
const sortField = ref('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const exportDropdownOpen = ref(false);
const alertsCollapsed = ref(false);
const showColumnSettings = ref(false);

// Колонки таблицы
const allColumns = [
  { key: 'name', label: 'Наименование' },
  { key: 'mark', label: 'Марка' },
  { key: 'registration_number', label: 'Учётный №' },
  { key: 'initial_resource', label: 'Исходный ресурс' },
  { key: 'remaining_resource', label: 'Остаточный ресурс' },
  { key: 'installed_in', label: 'Установлен в' },
  { key: 'location', label: 'Размещение' },
  { key: 'status', label: 'Статус' },
  { key: 'note', label: 'Примечание' },
];
const selectedColumns = ref(allColumns.map(c => c.key));
const visibleColumns = computed(() => allColumns.filter(c => selectedColumns.value.includes(c.key)));

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  try {
    const role = JSON.parse(user).role;
    return role === 'operator' || role === 'admin';
  } catch { return false; }
});

// Определение статуса ресурса (по ТЗ: получен, исправен, неисправен, в ремонте, на поверке, законсервирован, списан)
function getResourceStatus(res: any): string {
  if (res.is_deleted) return 'Списан';
  const remaining = toNumber(res.remaining_resource);
  if (remaining !== null) {
    if (remaining <= 20) return 'Неисправен';
    if (remaining <= 50) return 'В ремонте';
    if (remaining <= 80) return 'На поверке';
    return 'Исправен';
  }
  return 'Получен';
}

// Предупреждения
const alerts = computed(() => {
  const result: { type: string; message: string }[] = [];
  for (const res of store.resources) {
    if (res.is_deleted) continue;
    const remaining = toNumber(res.remaining_resource);
    if (remaining !== null && remaining <= 20) {
      result.push({ type: 'danger', message: `🔴 ${res.name}: остаточный ресурс критический (${remaining}%)` });
    } else if (remaining !== null && remaining <= 50) {
      result.push({ type: 'warning', message: `⚠️ ${res.name}: остаточный ресурс менее 50% (${remaining}%)` });
    }
  }
  return result;
});

function toggleAlerts() { alertsCollapsed.value = !alertsCollapsed.value; }

function getRowClass(res: any): string {
  if (res.is_deleted) return 'row-disabled';
  const status = getResourceStatus(res);
  if (status === 'Неисправен') return 'row-critical';
  if (status === 'В ремонте' || status === 'На поверке') return 'row-warning';
  return '';
}

// Фильтрация
const filteredResources = computed(() => {
  let list = [...store.resources];
  const f = filters.value;
  
  // Простой фильтр
  if (f.search) {
    const s = f.search.toLowerCase();
    list = list.filter(r => 
      (r.name || '').toLowerCase().includes(s) ||
      (r.mark || '').toLowerCase().includes(s) ||
      (r.manufacturer || '').toLowerCase().includes(s)
    );
  }
  if (f.status) {
    list = list.filter(r => getResourceStatus(r) === f.status);
  }
  
  // Расширенный фильтр
  for (const cond of advancedFilters.value) {
    if (!cond.field || !cond.value) continue;
    list = list.filter(r => {
      let value = '';
      if (cond.field === 'status') {
        value = getResourceStatus(r);
      } else {
        value = String(r[cond.field] || '');
      }
      const filterValue = cond.value.toLowerCase();
      const strValue = value.toLowerCase();
      switch (cond.operator) {
        case 'contains': return strValue.includes(filterValue);
        case 'equals': return strValue === filterValue;
        case 'starts': return strValue.startsWith(filterValue);
        case 'ends': return strValue.endsWith(filterValue);
        default: return true;
      }
    });
  }
  
  return list;
});

function addFilterCondition() {
  advancedFilters.value.push({ field: '', operator: 'contains', value: '' });
}

function removeFilterCondition(idx: number) {
  advancedFilters.value.splice(idx, 1);
}

function resetAdvancedFilters() {
  advancedFilters.value = [];
}

function applyAdvancedFilters() {
  showAdvancedFilter.value = false;
  applyFilters();
}

const sortedAndFilteredResources = computed(() => {
  const list = [...filteredResources.value];
  const field = sortField.value;
  const order = sortOrder.value;
  list.sort((a, b) => {
    let valA: any = a[field];
    let valB: any = b[field];
    if (field === 'status') {
      valA = getResourceStatus(a);
      valB = getResourceStatus(b);
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
});

function formatCell(res: any, key: string): string {
  if (key === 'status') return getResourceStatus(res);
  const value = res[key];
  if (value === undefined || value === null) return '-';
  if (key === 'initial_resource' || key === 'remaining_resource') return `${value}%`;
  return String(value);
}

function sortBy(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    sortOrder.value = 'asc';
  }
}

function applyFilters() { store.fetchResources(); }
function resetFilters() {
  filters.value = { search: '', status: '' };
  advancedFilters.value = [];
  sortField.value = 'name';
  sortOrder.value = 'asc';
  applyFilters();
}

function openForm() { formRef.value?.open(); }
function openAddMeasurementModal() { addMeasurementModalRef.value?.open(); }
function openMeasurementsModal() { measurementsModalRef.value?.open(); }
function editResource(res: any) { formRef.value?.open(res); }
async function deleteResource(id: string) {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить ресурс?');
  if (ok) await store.deleteResource(id);
}
function viewCard(id: string) { router.push(`/resources/${id}`); }
function refresh() { applyFilters(); }

function getExportData() {
  return sortedAndFilteredResources.value.map(r => {
    const row: Record<string, any> = {};
    for (const col of visibleColumns.value) {
      row[col.label] = formatCell(r, col.key);
    }
    return row;
  });
}

function exportToExcel() {
  const data = getExportData();
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  const filename = `Ресурсы_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace(/-/g, '_')}`;
  exportUtils.exportToExcel(data, filename);
  exportDropdownOpen.value = false;
}

function exportToWord() {
  const data = getExportData();
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  const firstItem = data[0];
  if (!firstItem) {
    alert('Нет данных для экспорта');
    return;
  }
  const headers = Object.keys(firstItem);
  const filename = `Ресурсы_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace(/-/g, '_')}`;
  exportUtils.exportToWord(data, headers, filename);
  exportDropdownOpen.value = false;
}
function toggleExportDropdown() { exportDropdownOpen.value = !exportDropdownOpen.value; }
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.dropdown')) exportDropdownOpen.value = false;
}

async function loadNodes() {
  await equipmentStore.fetchNodes();
  nodes.value = equipmentStore.nodes;
}

onMounted(() => {
  loadNodes();
  store.fetchResources();
  document.addEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.action-buttons { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
.filter-panel { background: #f8f9fa; border: 1px solid #e0e4e8; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
.filter-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
.btn-link { background: none; border: none; color: #2c5f8a; cursor: pointer; font-size: 14px; padding: 0; margin-top: 8px; }
.btn-link:hover { text-decoration: underline; }
.advanced-filter-panel { background: #fff; border: 1px solid #e0e4e8; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
.filter-conditions { margin-bottom: 15px; }
.filter-condition { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
.filter-condition .form-control { width: auto; min-width: 150px; }
.filter-actions { display: flex; gap: 10px; justify-content: flex-end; }
.table-toolbar { display: flex; gap: 10px; margin-bottom: 15px; justify-content: flex-end; }
.dropdown { position: relative; }
.dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: white; border: 1px solid #e0e4e8; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 100; min-width: 150px; }
.dropdown-item { display: block; width: 100%; padding: 8px 12px; text-align: left; background: none; border: none; cursor: pointer; font-size: 14px; }
.dropdown-item:hover { background-color: #f0f2f5; }
.alert-panel { background: #fff3e0; border: 1px solid #e0e4e8; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
.alert-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; background: #fff3e0; }
.alert-header h4 { margin: 0; }
.alert-list { padding: 0 16px 16px 16px; }
.alert-item { padding: 6px 0; border-bottom: 1px solid #ffe0b3; }
.alert-item:last-child { border-bottom: none; }
.alert-item.danger { color: #c0392b; font-weight: 500; }
.alert-item.warning { color: #e67e22; }
.table-scroll-container { width: 100%; overflow-x: auto; max-height: 500px; border: 1px solid #e0e4e8; border-radius: 8px; background: white; }
.table-scroll-container::-webkit-scrollbar { width: 12px; height: 12px; }
.table-scroll-container::-webkit-scrollbar-track { background: #e0e4e8; border-radius: 6px; }
.table-scroll-container::-webkit-scrollbar-thumb { background: #2c5f8a; border-radius: 6px; cursor: pointer; }
.table-scroll-container::-webkit-scrollbar-thumb:hover { background: #1e4566; }
.table-scroll-container .data-table { min-width: 1000px; }
.actions-cell { white-space: nowrap; }
.actions-cell .btn { margin-right: 4px; }
.empty-data { text-align: center; padding: 20px; color: #999; }
.row-critical { background-color: #ffe0e0; }
.row-warning { background-color: #fff3e0; }
.row-disabled { background-color: #f0f0f0; color: #999; opacity: 0.7; }
</style>
