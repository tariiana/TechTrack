<template>
  <div class="card" v-if="resource">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>{{ resource.name }}</h2>
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editResource">Редактировать</button>
        <button v-if="canEdit" class="btn btn-danger" @click="deleteResource">Списать</button>
        <div class="dropdown">
          <button class="btn btn-secondary" @click="toggleExportDropdown">📎 Экспорт</button>
          <div v-if="exportDropdownOpen" class="dropdown-menu">
            <button class="dropdown-item" @click="exportToExcel">Microsoft Excel (.xlsx)</button>
            <button class="dropdown-item" @click="exportToWord">Microsoft Word (.docx)</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Основные сведения -->
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Наименование</div>
        <div class="info-value">{{ resource.name }}</div>
        <div class="info-label">Марка</div>
        <div class="info-value">{{ resource.mark || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Тип</div>
        <div class="info-value">{{ resource.type || '-' }}</div>
        <div class="info-label">Дата производства</div>
        <div class="info-value">{{ formatDate(resource.production_date) || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Узел</div>
        <div class="info-value">{{ resource.node_name || '-' }}</div>
        <div class="info-label">Срок службы</div>
        <div class="info-value">{{ resource.service_life ? resource.service_life + ' лет' : '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата регистрации</div>
        <div class="info-value">{{ formatDate(resource.registration_date) }}</div>
        <div class="info-label">Учётный номер</div>
        <div class="info-value">{{ formatOptional(resource.registration_number) }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата последнего ТО</div>
        <div class="info-value">{{ resource.last_service_date || '-' }}</div>
        <div class="info-label">Срок до ТО</div>
        <div class="info-value">{{ resource.time_to_service ? resource.time_to_service + ' лет' : '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Исходный ресурс</div>
        <div class="info-value">{{ formatOptional(resource.initial_resource) }}</div>
        <div class="info-label">Остаточный ресурс</div>
        <div class="info-value">{{ formatOptional(resource.remaining_resource) }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Установлен в</div>
        <div class="info-value">{{ formatOptional(resource.installed_in) }}</div>
      </div>
    </div>

    <!-- Предупреждения -->
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

    <!-- Параметры -->
    <h3>Параметры</h3>
    <div class="table-scroll-container" v-if="parameters.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
            <th>Ед. изм.</th>
            <th>Основной</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in parameters" :key="param.name">
            <td>{{ param.name }}</td>
            <td>{{ param.value }}</td>
            <td>{{ param.unit || '-' }}</td>
            <td class="is-main-cell" @click="toggleMainParam(param)">
              {{ param.is_main ? '✅' : '◻️' }}
            </td>
          </tr>
          <tr v-if="parameters.length === 0">
            <td colspan="4">Нет параметров</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-message">Нет параметров</div>

    <!-- График -->
    <ResourceChart :resource-id="resource.resource_id" :key="chartKey" />

    <!-- Примечания -->
    <div v-if="resource.note" class="notes-section">
      <h4>Примечания</h4>
      <p>{{ resource.note }}</p>
    </div>

    <!-- Кнопки журнала и добавления измерения -->
    <div class="measurement-buttons">
      <button class="btn btn-secondary" @click="openMeasurementsModal">📊 Журнал измерений</button>
      <button class="btn btn-primary" @click="openAddMeasurementModal">+ Добавить измерение</button>
    </div>

    <div class="text-muted" style="margin-top: 15px">
      <small>Создан: {{ formatDate(resource.created_at) }} | Обновлён: {{ formatDate(resource.updated_at) }}</small>
    </div>

    <!-- Модальные окна -->
    <ResourceForm ref="formRef" @saved="refresh" />
    <AddMeasurementModal ref="addMeasurementModalRef" @saved="refresh" />
    <MeasurementsModal ref="measurementsModalRef" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import ResourceForm from './ResourceForm.vue';
import ResourceChart from './ResourceChart.vue';
import AddMeasurementModal from './AddMeasurementModal.vue';
import MeasurementsModal from './MeasurementsModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';
import * as exportUtils from '@/utils/exportUtils';

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const result = Number(match[0]);
  return Number.isFinite(result) ? result : null;
}

function formatOptional(value: any): string {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

const route = useRoute();
const router = useRouter();
const store = useResourcesStore();
const formRef = ref();
const addMeasurementModalRef = ref();
const measurementsModalRef = ref();
const confirmDialog = ref();

const resource = ref<any>(null);
const parameters = ref<any[]>([]);
const exportDropdownOpen = ref(false);
const alertsCollapsed = ref(false);
const chartKey = ref(0);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

const alerts = computed(() => {
  const result: { type: string; message: string }[] = [];
  if (!resource.value) return result;
  
  const remainingNum = toNumber(resource.value.remaining_resource);
  if (remainingNum !== null) {
    if (remainingNum <= 20) {
      result.push({ type: 'danger', message: `🔴 Остаточный ресурс критический (${remainingNum}%)` });
    } else if (remainingNum <= 50) {
      result.push({ type: 'warning', message: `⚠️ Остаточный ресурс менее 50% (${remainingNum}%)` });
    }
  }
  
  const timeToService = toNumber(resource.value.time_to_service);
  if (timeToService !== null && timeToService < 1) {
    result.push({ type: 'warning', message: `⚠️ Срок до ТО менее года (${resource.value.time_to_service} лет)` });
  }
  
  return result;
});

function toggleAlerts() { alertsCollapsed.value = !alertsCollapsed.value; }

async function toggleMainParam(param: any) {
  if (!canEdit.value) return;
  param.is_main = !param.is_main;
  await saveParameters();
}

async function saveParameters() {
  try {
    const resourceParams: Record<string, any> = {};
    for (const param of parameters.value) {
      resourceParams[param.name] = {
        value: param.value,
        unit: param.unit,
        is_main: param.is_main,
      };
    }
    await store.upsertResource(resource.value.node_id, { resource_params: resourceParams });
  } catch (err) {
    console.error(err);
  }
}

async function loadData() {
  const id = route.params.id as string;
  try {
    resource.value = await store.fetchResourceById(id);
    await loadParameters();
    chartKey.value++;
  } catch (err) {
    console.error(err);
  }
}

async function loadParameters() {
  if (!resource.value) return;
  console.log('Resource data:', resource.value);
  const params = resource.value.resource_params || {};
   console.log('Resource params:', params);
  const paramsArray: any[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'measurements') {
      const v = value as any;
      paramsArray.push({
        name: key,
        value: v.value !== undefined ? v.value : v,
        unit: v.unit || '',
        is_main: v.is_main || false,
      });
    }
  }
  parameters.value = paramsArray;
}

function goBack() { router.back(); }
function editResource() { formRef.value?.open(resource.value); }
async function deleteResource() {
  const ok = await confirmDialog.value?.show('Списание', 'Списать ресурс?');
  if (ok) {
    await store.deleteResource(resource.value.resource_id);
    router.back();
  }
}
function openAddMeasurementModal() { addMeasurementModalRef.value?.open(resource.value.resource_id); }
function openMeasurementsModal() { measurementsModalRef.value?.open(resource.value.resource_id); }
function refresh() { loadData(); }

function getExportData() {
  if (!resource.value) return [];
  return [{
    'Наименование': resource.value.name || '-',
    'Марка': resource.value.mark || '-',
    'Тип': resource.value.type || '-',
    'Дата производства': resource.value.production_date || '-',
    'Узел': resource.value.node_name || '-',
    'Срок службы': resource.value.service_life ? `${resource.value.service_life} лет` : '-',
    'Дата регистрации': resource.value.registration_date || '-',
    'Учётный номер': formatOptional(resource.value.registration_number),
    'Дата последнего ТО': resource.value.last_service_date || '-',
    'Срок до ТО': resource.value.time_to_service ? `${resource.value.time_to_service} лет` : '-',
    'Исходный ресурс': formatOptional(resource.value.initial_resource),
    'Остаточный ресурс': formatOptional(resource.value.remaining_resource),
    'Установлен в': formatOptional(resource.value.installed_in),
    'Примечание': resource.value.note || '-',
  }];
}

function exportToExcel() {
  const data = getExportData();
  if (data.length === 0 || !data[0]) {
    alert('Нет данных для экспорта');
    return;
  }
  const filename = `${resource.value.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace(/-/g, '_')}`;
  exportUtils.exportToExcel(data, filename);
  exportDropdownOpen.value = false;
}

function exportToWord() {
  const data = getExportData();
  if (data.length === 0 || !data[0]) {
    alert('Нет данных для экспорта');
    return;
  }
  const headers = Object.keys(data[0]);
  const filename = `${resource.value.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace(/-/g, '_')}`;
  exportUtils.exportToWord(data, headers, filename);
  exportDropdownOpen.value = false;
}

function toggleExportDropdown() { exportDropdownOpen.value = !exportDropdownOpen.value; }
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.dropdown')) exportDropdownOpen.value = false;
}

onMounted(() => {
  loadData();
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resource-saved', refresh);
});
</script>

<style scoped>
.action-buttons { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.info-grid { background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
.info-row { display: grid; grid-template-columns: 150px 1fr 150px 1fr; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e0e4e8; }
.info-row:last-child { border-bottom: none; }
.info-label { font-weight: 600; color: #2c3e50; }
.info-value { color: #1a2a3a; }

.alert-panel { background: #fff3e0; border: 1px solid #e0e4e8; border-radius: 8px; margin-bottom: 20px; overflow: hidden; }
.alert-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; cursor: pointer; background: #fff3e0; }
.alert-header h4 { margin: 0; }
.alert-list { padding: 0 16px 16px 16px; }
.alert-item { padding: 6px 0; border-bottom: 1px solid #ffe0b3; }
.alert-item:last-child { border-bottom: none; }
.alert-item.danger { color: #c0392b; font-weight: 500; }
.alert-item.warning { color: #e67e22; }

.table-scroll-container { width: 100%; overflow-x: auto; border: 1px solid #e0e4e8; border-radius: 8px; background: white; margin: 10px 0; }
.table-scroll-container .data-table { min-width: 500px; }
.is-main-cell { cursor: pointer; text-align: center; }
.is-main-cell:hover { background-color: #f0f2f5; }
.empty-message { color: #999; font-style: italic; padding: 10px; }

.measurement-buttons { display: flex; gap: 10px; margin-top: 20px; }
.notes-section { margin-top: 20px; padding: 12px; background: #f8f9fa; border-radius: 8px; }
.notes-section h4 { margin-bottom: 8px; }

.dropdown { position: relative; }
.dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: white; border: 1px solid #e0e4e8; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 100; min-width: 150px; }
.dropdown-item { display: block; width: 100%; padding: 8px 12px; text-align: left; background: none; border: none; cursor: pointer; font-size: 14px; }
.dropdown-item:hover { background-color: #f0f2f5; }

.text-muted { color: #6c757d; }
</style>
