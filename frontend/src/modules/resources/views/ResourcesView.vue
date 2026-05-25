<template>
  <div class="card">
    <!-- Заголовок и кнопки -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Ресурсы оборудования</h2>
     <div class="action-buttons">
  <button class="btn btn-secondary" @click="openMeasurementsModal">📊 Журнал измерений</button>
  <button v-if="canEdit" class="btn btn-secondary" @click="openAddMeasurementModal">+ Добавить измерение параметра</button>
  <button v-if="canEdit" class="btn btn-primary" @click="openForm">+ Добавить оборудование</button>
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

    <!-- Панель фильтрации -->
    <div class="filter-panel">
      <div class="filter-row">
        <input v-model="filters.search" type="text" placeholder="Поиск по наименованию..." class="form-control" style="width: 300px" @input="applyFilters" />
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
       <button class="btn btn-secondary btn-fixed" @click="toggleExportDropdown">
    📎 Экспорт {{ exportDropdownOpen ? '▲' : '▼' }}
  </button>
  <div v-if="exportDropdownOpen" class="dropdown-menu">
    <button class="dropdown-item" @click="exportToExcel">Microsoft Excel (.xlsx)</button>
    <button class="dropdown-item" @click="exportToWord">Microsoft Word (.docx)</button>
        </div>
      </div>
    </div>

    <!-- Настройка колонок -->
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
              <button v-if="canEdit && !isWrittenOff(res)" class="btn btn-sm btn-secondary" @click="editResource(res)">✏️</button>
      
              <span v-if="isWrittenOff(res)" class="badge-disabled">Списан</span>
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

const filters = ref({ search: '', status: '' });
const advancedFilters = ref<{ field: string; operator: string; value: string }[]>([]);
const showAdvancedFilter = ref(false);
const nodes = ref<any[]>([]);
const sortField = ref('name');
const sortOrder = ref<'asc' | 'desc'>('asc');
const exportDropdownOpen = ref(false);
const alertsCollapsed = ref(false);
const showColumnSettings = ref(false);

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

function normalizeStatus(status: any): string {
  const value = String(status || '').trim();
  const map: Record<string, string> = {
    'списан': 'Списан',
    'РЎРїРёСЃР°РЅ': 'Списан',
    'РџРѕР»СѓС‡РµРЅ': 'Получен',
    'РСЃРїСЂР°РІРµРЅ': 'Исправен',
    'РќРµРёСЃРїСЂР°РІРµРЅ': 'Неисправен',
    'Р’ СЂРµРјРѕРЅС‚Рµ': 'В ремонте',
    'РќР° РїРѕРІРµСЂРєРµ': 'На поверке',
    'Р—Р°РєРѕРЅСЃРµСЂРІРёСЂРѕРІР°РЅ': 'Законсервирован',
  };
  return map[value] || value || 'Получен';
}

function getResourceStatus(res: any): string {
  return normalizeStatus(res.status);
}

function isWrittenOff(res: any): boolean {
  return getResourceStatus(res).toLowerCase() === 'списан';
}

const alerts = computed(() => {
  const result: { type: string; message: string }[] = [];
  for (const res of store.resources) {
    if (isWrittenOff(res)) continue;
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
  if (res.status === 'списан' || res.isDeleted) {
    return 'disabled-row';
  }
  
if (isWrittenOff(res)) return 'disabled-row';
  const remaining = toNumber(res.remaining_resource);
  if (remaining !== null && remaining <= 20) return 'expired-row';
  if (remaining !== null && remaining <= 50) return 'warning-row';
  return '';
  }
    
const filteredResources = computed(() => {
  let list = [...store.resources];
  const f = filters.value;
  if (f.search) {
    const s = f.search.toLowerCase();
    list = list.filter(r => (r.name || '').toLowerCase().includes(s) || (r.mark || '').toLowerCase().includes(s));
  }
  if (f.status) {
    list = list.filter(r => getResourceStatus(r) === f.status);
  }
  for (const cond of advancedFilters.value) {
    if (!cond.field || !cond.value) continue;
    list = list.filter(r => {
      let value = cond.field === 'status' ? getResourceStatus(r) : String(r[cond.field] || '');
      const strValue = value.toLowerCase();
      const filterValue = cond.value.toLowerCase();
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

function addFilterCondition() { advancedFilters.value.push({ field: '', operator: 'contains', value: '' }); }
function removeFilterCondition(idx: number) { advancedFilters.value.splice(idx, 1); }
function resetAdvancedFilters() { advancedFilters.value = []; }
function applyAdvancedFilters() { showAdvancedFilter.value = false; }

const sortedAndFilteredResources = computed(() => {
  const list = [...filteredResources.value];
  list.sort((a, b) => {
    const getPriority = (res: any) => {
      if (res.status === 'списан' || res.isDeleted) return 4;
      if (isWrittenOff(res)) return 3;
      const r = toNumber(res.remaining_resource);
      if (r !== null && r <= 20) return 0;
      if (r !== null && r <= 50) return 1;
      return 2;
    };
    const pa = getPriority(a), pb = getPriority(b);
    if (pa !== pb) return pa - pb;
    let va = a[sortField.value], vb = b[sortField.value];
    if (sortField.value === 'status') { va = getResourceStatus(a); vb = getResourceStatus(b); }
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortOrder.value === 'asc' ? -1 : 1;
    if (va > vb) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
});

function formatCell(res: any, key: string): string {
  if (key === 'status') return getResourceStatus(res);
  const val = res[key];
  if (val === undefined || val === null || val === '') return '-';
  if (key === 'initial_resource' || key === 'remaining_resource') return `${val}%`;
  return String(val);
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
async function writeOffResource(id: string) {
  const resource = store.resources.find(r => r.resource_id === id);
  if (!resource) return;
  
  const ok = await confirmDialog.value?.show(
    'Списание ресурса',
    `Списать ресурс "${resource.name}"?`
  );
  if (ok) {
    await store.writeOffResource(id);
  }
}

function viewCard(id: string) { router.push(`/resources/${id}`); }
async function refresh() { await store.fetchResources(); }

function getExportData() {
  return sortedAndFilteredResources.value.map(r => {
    const row: Record<string, any> = {};
    for (const col of visibleColumns.value) row[col.label] = formatCell(r, col.key);
    return row;
  });
}

function exportToExcel() {
  const data = getExportData();
  if (data.length === 0) { alert('Нет данных для экспорта'); return; }
  exportUtils.exportToExcel(data, `Ресурсы_${new Date().toISOString().slice(0,19).replace(/:/g,'-').replace(/-/g,'_')}`);
  exportDropdownOpen.value = false;
}

function exportToWord() {
  const data = getExportData();
  if (data.length === 0) { alert('Нет данных для экспорта'); return; }
  if (!data[0]) return;
  exportUtils.exportToWord(data, Object.keys(data[0]), `Ресурсы_${new Date().toISOString().slice(0,19).replace(/:/g,'-').replace(/-/g,'_')}`);
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
  align-items: center;
  margin-bottom: 10px;
}

.btn-link {
  background: none;
  border: none;
  color: #2c5f8a;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  margin-top: 8px;
}

.btn-link:hover {
  text-decoration: underline;
}

/* Расширенный фильтр */
.advanced-filter-panel {
  background: #fff;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.filter-conditions {
  margin-bottom: 15px;
}
.action-buttons .btn {
  margin-right: 12px;
}

.action-buttons .btn:last-child {
  margin-right: 0;
}
.filter-condition {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.filter-condition .form-control {
  width: auto;
  min-width: 150px;
}

.filter-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Панель инструментов таблицы */
.table-toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: flex-end;
}

/* Блок предупреждений */
.alert-panel {
  background: #fff3e0;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  background: #fff3e0;
}

.alert-header h4 {
  margin: 0;
}

.alert-list {
  padding: 0 16px 16px 16px;
}

.alert-item {
  padding: 6px 0;
  border-bottom: 1px solid #ffe0b3;
}

.alert-item:last-child {
  border-bottom: none;
}

.alert-item.danger {
  color: #c0392b;
  font-weight: 500;
}
.actions-cell {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.alert-item.warning {
  color: #e67e22;
}
.dropdown { position: relative; }
.dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: white; border: 1px solid #e0e4e8; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 100; min-width: 150px; }
.dropdown-item { display: block; width: 100%; padding: 8px 12px; text-align: left; background: none; border: none; cursor: pointer; font-size: 14px; }
.dropdown-item:hover { background-color: #f0f2f5; }
.alert-panel { background: #fff3e0; border: 1px solid #e0e4e8; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
</style>
