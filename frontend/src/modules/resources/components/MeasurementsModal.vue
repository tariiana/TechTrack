<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 1000px">
      <div class="modal-header">
        <h3>Журнал измерения остаточных ресурсов</h3>
        <div class="header-buttons">
          <button class="btn btn-sm btn-secondary" @click="showFilterPanel = !showFilterPanel">🔍 Фильтр</button>
          <button class="btn btn-sm btn-secondary" @click="showColumnSettings = true">⚙️ Колонки</button>
          <div class="dropdown">
            <button class="btn btn-sm btn-secondary" @click="toggleExportDropdown">📎 Экспорт</button>
            <div v-if="exportDropdownOpen" class="dropdown-menu">
              <button class="dropdown-item" @click="exportToExcel">Excel</button>
              <button class="dropdown-item" @click="exportToWord">Word</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Фильтр -->
      <div v-if="showFilterPanel" class="filter-panel">
        <div class="filter-row">
          <input v-model="filters.resourceName" placeholder="Наименование" class="form-control" />
          <input v-model="filters.mark" placeholder="Марка" class="form-control" />
          <input v-model="filters.registrationNumber" placeholder="Учётный №" class="form-control" />
          <input type="date" v-model="filters.dateFrom" placeholder="Дата от" class="form-control" />
          <input type="date" v-model="filters.dateTo" placeholder="Дата до" class="form-control" />
          <button class="btn btn-primary btn-sm" @click="applyFilters">Найти</button>
          <button class="btn btn-secondary btn-sm" @click="resetFilters">Сбросить</button>
        </div>
      </div>

      <!-- Таблица -->
      <div class="table-wrapper">
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
                <button class="btn btn-sm btn-danger" @click="deleteMeasurement(m.id)">🗑️</button>
              </td>
            </tr>
            <tr v-if="filteredAndSortedMeasurements.length === 0">
              <td :colspan="visibleColumns.length + 1" style="text-align: center">Нет измерений</td>
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
        <label><input type="checkbox" v-model="selectedColumns" :value="col.key" /> {{ col.label }}</label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showColumnSettings = false">Закрыть</button>
      </div>
    </div>
  </div>

  <AddMeasurementModal ref="editModalRef" @saved="refresh" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';
import AddMeasurementModal from './AddMeasurementModal.vue';
import { formatDate } from '@/utils/dateUtils';
import * as XLSX from 'xlsx';

const store = useResourcesStore();
const editModalRef = ref();
const visible = ref(false);
const measurements = ref<any[]>([]);
const exportDropdownOpen = ref(false);
const showColumnSettings = ref(false);
const showFilterPanel = ref(false);
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

function getParametersSummary(measurement: any): string {
  const resourceParams = store.getParametersForResource(measurement.resourceId);
  const mainParamNames = resourceParams.filter(p => p.isMain).map(p => p.name);
  if (mainParamNames.length === 0) return '-';
  const parts: string[] = [];
  for (const name of mainParamNames) {
    let key = '';
    if (name === 'Напряжение') key = 'U';
    else if (name === 'Внутреннее сопротивление') key = 'R';
    else if (name === 'Ёмкость' || name === 'Емкость') key = 'E';
    else if (name === 'C') key = 'C';
    else key = name;
    const value = measurement.parameters?.[key];
    if (value !== undefined && value !== null) parts.push(`${key}=${value}`);
  }
  return parts.length ? parts.join('; ') : '-';
}

function formatCell(m: any, key: string): string {
  if (key === 'measurementDate') return formatDate(m.measurementDate);
  if (key === 'parametersSummary') return getParametersSummary(m);
  return m[key] || '-';
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
  if (f.resourceName) list = list.filter(m => (m.resourceName || '').toLowerCase().includes(f.resourceName.toLowerCase()));
  if (f.mark) list = list.filter(m => (m.mark || '').toLowerCase().includes(f.mark.toLowerCase()));
  if (f.registrationNumber) list = list.filter(m => String(m.registrationNumber || '').includes(f.registrationNumber));
  if (f.dateFrom) list = list.filter(m => m.measurementDate >= f.dateFrom);
  if (f.dateTo) list = list.filter(m => m.measurementDate <= f.dateTo);
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

function loadMeasurements() { measurements.value = [...store.measurements]; }
function open() { loadMeasurements(); visible.value = true; }
function close() { visible.value = false; exportDropdownOpen.value = false; }
function editMeasurement(m: any) { editModalRef.value?.open(m); }
function deleteMeasurement(id: number) { if (confirm('Удалить измерение?')) { store.deleteMeasurement(id); loadMeasurements(); } }
function refresh() { loadMeasurements(); }
function applyFilters() {}
function resetFilters() { filters.value = { resourceName: '', mark: '', registrationNumber: '', dateFrom: '', dateTo: '' }; }

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
  if (data.length === 0) { alert('Нет данных для экспорта'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Журнал измерений');
  XLSX.writeFile(wb, `Журнал_измерений_${new Date().toISOString().slice(0, 10)}.xlsx`);
  exportDropdownOpen.value = false;
}

function exportToWord() {
  const data = getExportData();
  if (data.length === 0) { alert('Нет данных для экспорта'); return; }
  const headers = Object.keys(data[0]);
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Журнал измерений</title>`;
  html += `<style>body{font-family:Arial;} table{border-collapse:collapse;width:100%} th,td{border:1px solid #000;padding:6px;text-align:left}</style></head><body>`;
  html += `<h1>Журнал измерения остаточных ресурсов</h1><p>Дата: ${new Date().toLocaleDateString()}</p>`;
  html += `<table><thead><tr>`;
  for (const h of headers) html += `<th>${h}</th>`;
  html += `</tr></thead><tbody>`;
  for (const row of data) {
    html += `<tr>`;
    for (const h of headers) html += `<td>${row[h]}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Журнал_измерений_${new Date().toISOString().slice(0, 10)}.doc`;
  link.click();
  URL.revokeObjectURL(link);
  exportDropdownOpen.value = false;
}

function toggleExportDropdown() { exportDropdownOpen.value = !exportDropdownOpen.value; }

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
.filter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-row .form-control {
  width: auto;
  min-width: 130px;
}
.dropdown { position: relative; }
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
  min-width: 120px;
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
.dropdown-item:hover { background-color: #f0f2f5; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #e0e4e8;
}
.actions-cell {
  white-space: nowrap;
}
.actions-cell .btn {
  margin-right: 4px;
}
</style>