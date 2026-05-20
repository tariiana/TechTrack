<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 1200px">
      <div class="modal-header">
        <h3>Журнал измерения остаточных ресурсов</h3>
        <div class="header-buttons">
          <button class="btn btn-sm btn-secondary" @click="showFilterPanel = !showFilterPanel">🔍 Фильтр</button>
          <button class="btn btn-sm btn-secondary" @click="showColumnSettings = true">⚙️ Колонки</button>
          <div class="dropdown">
            <button class="btn btn-sm btn-secondary" @click="toggleExportDropdown">📎 Экспорт</button>
            <div v-if="exportDropdownOpen" class="dropdown-menu">
              <button class="dropdown-item" @click="exportToExcel">Microsoft Excel (.xlsx)</button>
              <button class="dropdown-item" @click="exportToWord">Microsoft Word (.docx)</button>
            </div>
          </div>
          <button class="btn btn-sm btn-primary" @click="openAddMeasurement">+ Добавить измерение</button>
        </div>
      </div>

      <!-- Фильтр -->
      <div v-if="showFilterPanel" class="filter-panel">
        <div class="filter-grid">
          <input v-model="filters.resourceName" placeholder="Наименование" class="form-control" @input="applyFilters" />
          <input v-model="filters.mark" placeholder="Марка" class="form-control" @input="applyFilters" />
          <input v-model="filters.registrationNumber" placeholder="Учётный №" class="form-control" @input="applyFilters" />
          <input type="date" v-model="filters.dateFrom" placeholder="Дата от" class="form-control" @change="applyFilters" />
          <input type="date" v-model="filters.dateTo" placeholder="Дата до" class="form-control" @change="applyFilters" />
          <button class="btn btn-primary btn-sm" @click="applyFilters">Найти</button>
          <button class="btn btn-secondary btn-sm" @click="resetFilters">Сбросить</button>
        </div>
      </div>

      <!-- Таблица измерений -->
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
            <tr v-for="m in filteredAndSortedMeasurements" :key="m.id">
              <td v-for="col in visibleColumns" :key="col.key">{{ formatCell(m, col.key) }}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-secondary" @click="editMeasurement(m)">✏️</button>
                <button class="btn btn-sm btn-danger" @click="confirmDeleteMeasurement(m.id)">🗑️</button>
              </td>
            </tr>
            <tr v-if="filteredAndSortedMeasurements.length === 0">
              <td :colspan="visibleColumns.length + 1" class="empty-data">Нет измерений</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Закрыть</button>
      </div>
    </div>
  </div>

  <!-- Настройка колонок -->
  <div class="modal-overlay" v-if="showColumnSettings">
    <div class="modal-content" style="width: 400px">
      <div class="modal-header">Настройка колонок</div>
      <div v-for="col in allColumns" :key="col.key" style="margin-bottom: 8px">
        <label>
          <input type="checkbox" v-model="selectedColumns" :value="col.key" /> {{ col.label }}
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showColumnSettings = false">Закрыть</button>
      </div>
    </div>
  </div>

  <AddMeasurementModal ref="addMeasurementModalRef" @saved="refresh" />
  <ConfirmDialog ref="confirmDialog" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';
import AddMeasurementModal from './AddMeasurementModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';
import * as exportUtils from '@/utils/exportUtils';

const store = useResourcesStore();
const addMeasurementModalRef = ref();
const confirmDialog = ref();

const visible = ref(false);
const measurements = ref<any[]>([]);
const resourceIdFilter = ref<string | null>(null);
const exportDropdownOpen = ref(false);
const showColumnSettings = ref(false);
const showFilterPanel = ref(true);
const sortField = ref('measurementDate');
const sortOrder = ref<'asc' | 'desc'>('desc');

const filters = ref({
  resourceName: '',
  mark: '',
  registrationNumber: '',
  dateFrom: '',
  dateTo: '',
});

const allColumns = [
  { key: 'resourceName', label: 'Наименование' },
  { key: 'mark', label: 'Марка' },
  { key: 'registrationNumber', label: 'Учётный №' },
  { key: 'measurementDate', label: 'Дата измерения' },
  { key: 'parametersSummary', label: 'Параметры (основные)' },
];
const selectedColumns = ref(allColumns.map(c => c.key));
const visibleColumns = computed(() => allColumns.filter(c => selectedColumns.value.includes(c.key)));

function getParametersSummary(m: any): string {
  const params = m.parameters || {};
  const parts: string[] = [];
  if (params.voltage !== undefined && params.voltage !== null) parts.push(`U = ${params.voltage}`);
  if (params.resistance !== undefined && params.resistance !== null) parts.push(`R = ${params.resistance}`);
  if (params.capacity !== undefined && params.capacity !== null) parts.push(`C = ${params.capacity}%`);
  return parts.length ? parts.join('; ') : '-';
}

function formatCell(m: any, key: string): string {
  switch (key) {
    case 'measurementDate': return formatDate(m.measurementDate);
    case 'parametersSummary': return getParametersSummary(m);
    default: return m[key] || '-';
  }
}

function sortBy(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field as any;
    sortOrder.value = 'asc';
  }
}

const filteredMeasurements = computed(() => {
  let list = [...measurements.value];
  const f = filters.value;
  if (resourceIdFilter.value) {
    list = list.filter(m => m.resourceId === resourceIdFilter.value);
  }
  if (f.resourceName) {
    list = list.filter(m => (m.resourceName || '').toLowerCase().includes(f.resourceName.toLowerCase()));
  }
  if (f.mark) {
    list = list.filter(m => (m.mark || '').toLowerCase().includes(f.mark.toLowerCase()));
  }
  if (f.registrationNumber) {
    list = list.filter(m => String(m.registrationNumber || '').includes(f.registrationNumber));
  }
  if (f.dateFrom) {
    list = list.filter(m => m.measurementDate >= f.dateFrom);
  }
  if (f.dateTo) {
    list = list.filter(m => m.measurementDate <= f.dateTo);
  }
  return list;
});

const filteredAndSortedMeasurements = computed(() => {
  const list = [...filteredMeasurements.value];
  list.sort((a, b) => {
    let valA: any, valB: any;
    if (sortField.value === 'measurementDate') {
      valA = new Date(a.measurementDate).getTime();
      valB = new Date(b.measurementDate).getTime();
    } else if (sortField.value === 'resourceName') {
      valA = a.resourceName || '';
      valB = b.resourceName || '';
    } else if (sortField.value === 'mark') {
      valA = a.mark || '';
      valB = b.mark || '';
    } else if (sortField.value === 'registrationNumber') {
      valA = a.registrationNumber || '';
      valB = b.registrationNumber || '';
    } else {
      return 0;
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
});

function applyFilters() {}
function resetFilters() {
  filters.value = { resourceName: '', mark: '', registrationNumber: '', dateFrom: '', dateTo: '' };
}

async function loadMeasurements(resourceId?: string) {
  resourceIdFilter.value = resourceId || null;
  await store.fetchResources();
  const allResources = store.resources;
  const allMeasurements: any[] = [];
  for (const res of allResources) {
    const measurementsList = res.resource_params?.measurements || [];
    for (const m of measurementsList) {
      const params = m.parameters || {};
      allMeasurements.push({
        id: m.id,
        resourceId: res.resource_id,
        resourceName: res.name,
        mark: res.mark,
        registrationNumber: res.registration_number,
        measurementDate: m.measurement_date,
        parameters: params,
      });
    }
  }
  allMeasurements.sort((a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
  measurements.value = allMeasurements;
}

async function open(resourceId?: string) {
  await loadMeasurements(resourceId);
  visible.value = true;
}

function close() {
  visible.value = false;
  exportDropdownOpen.value = false;
}

function openAddMeasurement() {
  addMeasurementModalRef.value?.open();
}

function editMeasurement(m: any) {
  addMeasurementModalRef.value?.open(m.resourceId, m);
}

async function confirmDeleteMeasurement(id: number) {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить измерение?');
  if (ok) {
    await deleteMeasurement(id);
  }
}

async function deleteMeasurement(measurementId: number) {
  const measurement = measurements.value.find(m => m.id === measurementId);
  if (!measurement) return;

  try {
    const resource = await store.fetchResourceById(measurement.resourceId);
    const params = resource.resource_params || {};
    let measurementsList = params.measurements || [];
    measurementsList = measurementsList.filter((m: any) => m.id !== measurementId);
    const updatedParams = { ...params, measurements: measurementsList };
    
    const payload = {
      name: resource.name,
      mark: resource.mark,
      type: resource.type,
      production_date: resource.production_date,
      registration_number: resource.registration_number,
      service_life: resource.service_life,
      time_to_service: resource.time_to_service,
      initial_resource: resource.initial_resource,
      remaining_resource: resource.remaining_resource,
      installed_in: resource.installed_in,
      location: resource.location,
      note: resource.note,
      resource_params: updatedParams,
    };
    await store.upsertResource(measurement.resourceId, payload);
    await loadMeasurements(resourceIdFilter.value || undefined);
  } catch (err) {
    console.error('Ошибка удаления измерения:', err);
  }
}

function refresh() {
  loadMeasurements(resourceIdFilter.value || undefined);
  window.dispatchEvent(new Event('resource-saved'));
}

function getExportData() {
  return filteredAndSortedMeasurements.value.map(m => ({
    'Наименование': m.resourceName || '-',
    'Марка': m.mark || '-',
    'Учётный №': m.registrationNumber || '-',
    'Дата измерения': formatDate(m.measurementDate),
    'Параметры (основные)': getParametersSummary(m),
  }));
}

function exportToExcel() {
  const data = getExportData();
  if (data.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }
  const filename = `Журнал_измерений_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace(/-/g, '_')}`;
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
  const filename = `Журнал_измерений_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace(/-/g, '_')}`;
  exportUtils.exportToWord(data, headers, filename);
  exportDropdownOpen.value = false;
}

function toggleExportDropdown() {
  exportDropdownOpen.value = !exportDropdownOpen.value;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.dropdown')) {
    exportDropdownOpen.value = false;
  }
}

watch(() => visible.value, (newVal) => {
  if (newVal) {
    document.addEventListener('click', handleClickOutside);
  } else {
    document.removeEventListener('click', handleClickOutside);
  }
});

defineExpose({ open, refresh });
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e4e8;
}
.header-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}
.filter-panel {
  background: #f8f9fa;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
  align-items: end;
}
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
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
.table-scroll-container .data-table {
  min-width: 800px;
}
.actions-cell {
  white-space: nowrap;
}
.actions-cell .btn {
  margin-right: 4px;
}
.empty-data {
  text-align: center;
  padding: 20px;
  color: #999;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #e0e4e8;
}
.dropdown {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 150px;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
.dropdown-item:hover {
  background-color: #f0f2f5;
}
</style>