
<template>
  <div class="card" v-if="resource">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>{{ resource.name }}</h2>
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editResource">Редактировать</button>
   
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

    <!-- Параметры (общая таблица) -->
<h3>Параметры</h3>
<div class="table-scroll-container" v-if="allParameters.length">
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
      <tr v-for="(param, idx) in allParameters" :key="param.key + idx">
        <td>{{ param.name }}</td>
        <td>{{ param.value }}</td>
        <td>{{ param.unit || '-' }}</td>
        <td class="is-main-cell" @click="toggleParamMain(param, idx)">
          {{ param.is_main ? '✅' : '◻️' }}
        </td>
      </tr>
      <tr v-if="allParameters.length === 0">
        <td colspan="4">Нет параметров</td>
      </tr>
    </tbody>
  </table>
</div>

    <!-- Кнопка добавления параметра -->
    <div v-if="canEdit" class="add-param-button" style="margin-top: 15px;">
      <button class="btn btn-sm btn-primary" @click="openAddCustomParam">+ Добавить параметр</button>
    </div>

    <!-- График (динамический) -->
    <div class="chart-section" v-if="hasChartData && availableParams.length">
      <h3>Динамика изменения параметров</h3>
      <canvas ref="chartCanvas" class="chart-canvas"></canvas>
      <div class="chart-controls">
        <select v-model="selectedParam" class="form-control" @change="renderChart">
          <option v-for="param in availableParams" :key="param.key" :value="param.key">
            {{ param.name }} {{ param.unit ? `(${param.unit})` : '' }}
          </option>
        </select>
      </div>
    </div>
    <div v-else-if="hasChartData && availableParams.length === 0" class="empty-message">
      Нет числовых параметров для построения графика
    </div>
    <div v-else class="empty-message">Нет данных для построения графика</div>

    <!-- Примечания -->
    <div v-if="resource.note" class="notes-section">
      <h4>Примечания</h4>
      <p>{{ resource.note }}</p>
    </div>

    <!-- Кнопки журнала и добавления измерения -->
    <div class="measurement-buttons">
      <button class="btn btn-secondary" @click="openMeasurementsModal">📊 Журнал измерений</button>
      <button v-if="canEdit" class="btn btn-primary" @click="openAddMeasurementModal">+ Добавить измерение</button>
    </div>

    <div class="text-muted" style="margin-top: 15px">
      <small>Создан: {{ formatDate(resource.created_at) }} | Обновлён: {{ formatDate(resource.updated_at) }}</small>
    </div>

    <!-- Модальные окна -->
    <ResourceForm ref="formRef" @saved="refresh" />
    <AddMeasurementModal ref="addMeasurementModalRef" @saved="refresh" />
    <MeasurementsModal ref="measurementsModalRef" />
    <ConfirmDialog ref="confirmDialog" />

    <!-- Модальное окно для дополнительного параметра -->
    <div class="modal-overlay" v-if="showCustomParamModal" @click.self="showCustomParamModal = false">
      <div class="modal-content" style="width: 450px;">
        <div class="modal-header">
          {{ editingCustomParamIndex !== null ? 'Редактирование параметра' : 'Добавление параметра' }}
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Название параметра *</label>
            <input v-model="customParamForm.name" class="form-control" placeholder="например: Температура" />
          </div>
          <div class="form-group">
            <label>Значение *</label>
            <input v-model="customParamForm.value" class="form-control" placeholder="значение" />
          </div>
          <div class="form-group">
            <label>Единица измерения</label>
            <input v-model="customParamForm.unit" class="form-control" placeholder="например: °C" />
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" v-model="customParamForm.is_main" /> Основной параметр
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showCustomParamModal = false">Отмена</button>
          <button class="btn btn-primary" @click="saveCustomParam">Сохранить</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import ResourceForm from './ResourceForm.vue';
import AddMeasurementModal from './AddMeasurementModal.vue';
import MeasurementsModal from './MeasurementsModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';
import * as exportUtils from '@/utils/exportUtils';
import Chart from 'chart.js/auto';

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
const props = defineProps<{
  embedded?: boolean;
  embeddedId?: string | number | null;
}>();
const emit = defineEmits<{
  (event: 'back'): void;
}>();
const formRef = ref();
const addMeasurementModalRef = ref();
const measurementsModalRef = ref();
const confirmDialog = ref();

const resource = ref<any>(null);
const parameters = ref<any[]>([]);
const customParams = ref<any[]>([]);
const exportDropdownOpen = ref(false);
const alertsCollapsed = ref(false);
const chartKey = ref(0);

// Переменные для графика
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: any = null;
const selectedParam = ref('');
const availableParams = ref<{ key: string; name: string; unit: string }[]>([]);
const targetResourceId = computed(() => {
  const id = props.embedded ? props.embeddedId : route.params.id;
  return id ? String(id) : '';
});

// Переменные для модального окна дополнительных параметров
const showCustomParamModal = ref(false);
const editingCustomParamIndex = ref<number | null>(null);
const customParamForm = ref({
  name: '',
  value: '',
  unit: '',
  is_main: false
});

// Объединяем основные и дополнительные параметры
const allParameters = computed(() => {
  const main = parameters.value.map(p => ({ ...p, is_custom: false, key: p.key || p.name }));
  const custom = customParams.value.map(p => ({ ...p, is_custom: true }));
  return [...main, ...custom];
});

const hasChartData = computed(() => {
  const measurements = resource.value?.resource_params?.measurements || [];
  return measurements.length > 0;
});

const canEdit = computed(() => {
  if (props.embedded) return false;
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
    result.push({ type: 'warning', message: `⚠️ Срок до ТО менее года (${timeToService} лет)` });
  }
  
  return result;
});

function toggleAlerts() { alertsCollapsed.value = !alertsCollapsed.value; }

// Получить индекс в customParams из общего индекса
function getCustomIndex(allIndex: number): number {
  const mainCount = parameters.value.length;
  return allIndex - mainCount;
}

// Переключение основного параметра (для любых параметров)
async function toggleParamMain(param: any, idx: number) {
  if (!canEdit.value) return;
  param.is_main = !param.is_main;
  
  if (param.is_custom) {
    const customIndex = getCustomIndex(idx);
    if (customIndex >= 0 && customIndex < customParams.value.length) {
      customParams.value[customIndex].is_main = param.is_main;
    }
  } else {
    const mainIndex = parameters.value.findIndex(p => (p.key || p.name) === (param.key || param.name));
    if (mainIndex !== -1) {
      parameters.value[mainIndex].is_main = param.is_main;
    }
  }
  
  await saveAllParameters();
  
  // 👇 ДОБАВИТЬ ЭТО — обновляем список параметров для графика
  extractAvailableParams();
}

// Функции для дополнительных параметров
function openAddCustomParam() {
  customParamForm.value = { name: '', value: '', unit: '', is_main: false };
  editingCustomParamIndex.value = null;
  showCustomParamModal.value = true;
}

function editCustomParam(customIndex: number) {
  if (customIndex >= 0 && customIndex < customParams.value.length) {
    const param = customParams.value[customIndex];
    customParamForm.value = {
      name: param.name,
      value: String(param.value),
      unit: param.unit || '',
      is_main: param.is_main
    };
    editingCustomParamIndex.value = customIndex;
    showCustomParamModal.value = true;
  }
}

async function deleteCustomParam(customIndex: number) {
  if (customIndex >= 0 && customIndex < customParams.value.length) {
    const param = customParams.value[customIndex];
    const ok = await confirmDialog.value?.show(
      'Удаление параметра',
      `Удалить параметр "${param.name}"?`
    );
    if (ok) {
      customParams.value.splice(customIndex, 1);
      await saveAllParameters();
      
      // 👇 ДОБАВИТЬ ЭТО — обновляем список параметров для графика
      extractAvailableParams();
    }
  }
}

async function saveCustomParam() {
  if (!customParamForm.value.name.trim()) {
    alert('Введите название параметра');
    return;
  }
  if (!customParamForm.value.value.trim()) {
    alert('Введите значение параметра');
    return;
  }
  
  const newParam = {
    name: customParamForm.value.name,
    value: customParamForm.value.value,
    unit: customParamForm.value.unit,
    is_main: customParamForm.value.is_main,
    key: customParamForm.value.name,
    is_custom: true
  };
  
  if (editingCustomParamIndex.value !== null) {
    customParams.value[editingCustomParamIndex.value] = newParam;
  } else {
    customParams.value.push(newParam);
  }
  
  showCustomParamModal.value = false;
  await saveAllParameters();
  
  // 👇 ДОБАВИТЬ ЭТО — обновляем список параметров для графика
  extractAvailableParams();
}

// Сохраняем все параметры (основные + дополнительные)
async function saveAllParameters() {
  try {
    const currentParams = resource.value.resource_params || {};
    const measurements = currentParams.measurements || [];
    
    const resourceParams: Record<string, any> = { measurements };
    
    // Сохраняем основные параметры
    for (const param of parameters.value) {
      let key = '';
      if (param.name === 'Напряжение') key = 'U';
      else if (param.name === 'Сопротивление') key = 'R';
      else if (param.name === 'Ёмкость (E)') key = 'E';
      else if (param.name === 'Ёмкость (C)') key = 'C';
      else key = param.key || param.name;
      
      resourceParams[key] = {
        value: param.value,
        unit: param.unit,
        is_main: param.is_main,
      };
    }
    
    // Сохраняем дополнительные параметры
    for (const param of customParams.value) {
      resourceParams[param.name] = {
        value: param.value,
        unit: param.unit,
        is_main: param.is_main,
      };
    }
    
    await store.upsertResource(resource.value.node_id, { resource_params: resourceParams });
    console.log('✅ Все параметры сохранены');
  } catch (err) {
    console.error('Ошибка сохранения параметров:', err);
  }
}

async function writeOffResource() {
  const ok = await confirmDialog.value?.show(
    'Списание ресурса',
    `Списать ресурс "${resource.value.name}"?`
  );
  if (ok) {
    await store.writeOffResource(resource.value.node_id);
    loadData();
  }
}

function extractAvailableParams() {
  const params = resource.value?.resource_params || {};
  
  // Список ключей, которые НЕ должны появляться в графике (служебные)
  const excludeKeys = [
    'measurements', 'status', 'mark', 'name', 'type', 'manufacturer', 
    'model', 'serial_number', 'inventory_number', 'registration_number', 
    'location', 'note', 'production_date', 'registration_date', 
    'last_service_date', 'service_life', 'time_to_service', 
    'initial_resource', 'remaining_resource', 'installed_in', 
    'node_name', 'node_id', 'created_at', 'updated_at', 'is_deleted',
    'resource_id', 'id', 'write_off_date'
  ];
  
  const paramsSet = new Map<string, { name: string; unit: string }>();
  
  // Проходим по всем параметрам из resource_params (как в таблице)
  for (const [key, value] of Object.entries(params)) {
    // Пропускаем служебные ключи
    if (excludeKeys.includes(key)) continue;
    if (key.endsWith('_main')) continue;
    
    // Получаем числовое значение
    let numValue: number | null = null;
    if (value && typeof value === 'object' && 'value' in value) {
      numValue = Number((value as any).value);
    } else {
      numValue = Number(value);
    }
    
    // Добавляем только числовые параметры
    if (!isNaN(numValue)) {
      let displayName = key;
      let unit = '';
      
      // Маппинг стандартных параметров для красивого отображения
      if (key === 'U' || key === 'voltage') { displayName = 'Напряжение'; unit = 'В'; }
      else if (key === 'R' || key === 'resistance') { displayName = 'Сопротивление'; unit = 'Ом'; }
      else if (key === 'E') { displayName = 'Ёмкость (E)'; unit = 'Втч'; }
      else if (key === 'C' || key === 'capacity') { displayName = 'Ёмкость (C)'; unit = '%'; }
      else if (key === 'health') { displayName = 'Здоровье'; unit = '%'; }
      else if (key === 'battery_level') { displayName = 'Уровень заряда'; unit = '%'; }
      else if (key === 'operating_hours') { displayName = 'Наработка'; unit = 'ч'; }
      else if (key === 'uptime') { displayName = 'Время работы'; unit = 'ч'; }
      else if (key === 'packet_loss') { displayName = 'Потери пакетов'; unit = '%'; }
      else {
        displayName = key;
        if (value && typeof value === 'object' && (value as any).unit) {
          unit = (value as any).unit;
        }
      }
      
      if (!paramsSet.has(key)) {
        paramsSet.set(key, { name: displayName, unit });
      }
    }
  }
  
  availableParams.value = Array.from(paramsSet.entries()).map(([key, info]) => ({
    key,
    name: info.name,
    unit: info.unit
  }));
  
  // Сортируем параметры для удобства
  availableParams.value.sort((a, b) => a.name.localeCompare(b.name));
  
  // Устанавливаем выбранный параметр
  if (availableParams.value.length > 0) {
    const first = availableParams.value[0];
    if (first && (!selectedParam.value || !availableParams.value.some(p => p.key === selectedParam.value))) {
      selectedParam.value = first.key;
    }
  }
}
// Функция отрисовки графика (динамическая)
async function renderChart() {
  if (!chartCanvas.value) return;
  
  const measurements = resource.value?.resource_params?.measurements || [];
  if (measurements.length === 0 || !selectedParam.value) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  const sorted = [...measurements].sort((a, b) => 
    new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
  );
  
  const labels = sorted.map(m => formatDate(m.measurement_date));
  const data = sorted.map(m => {
    let val = m.parameters?.[selectedParam.value];
    if (val && typeof val === 'object' && 'value' in val) {
      val = val.value;
    }
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  });
  
  const paramInfo = availableParams.value.find(p => p.key === selectedParam.value);
  const paramName = paramInfo?.name || selectedParam.value;
  const paramUnit = paramInfo?.unit || '';
  const label = paramUnit ? `${paramName} (${paramUnit})` : paramName;

  try {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;
    
    const canvas = chartCanvas.value;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = 300;
    }
    canvas.style.width = '100%';
    canvas.style.height = '300px';

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: '#2c5f8a',
          backgroundColor: 'rgba(44,95,138,0.1)',
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: '#2c5f8a',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { mode: 'index', intersect: false },
          legend: { position: 'top' }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: paramUnit || 'Значение'
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Chart error:', error);
  }
}

async function loadData() {
  const id = targetResourceId.value;
  if (!id) return;
  try {
    resource.value = await store.fetchResourceById(id);
    await loadParameters();
    extractAvailableParams();
    chartKey.value++;
    await nextTick();
    await renderChart();
  } catch (err) {
    console.error(err);
  }
}

async function loadParameters() {
  if (!resource.value) return;
  
  const params = resource.value.resource_params || {};
  
  // Служебные ключи, которые НЕ должны отображаться в таблице параметров
  const excludeKeys = [
    'measurements', 'status', 'mark', 'name', 'type', 'manufacturer', 
    'model', 'serial_number', 'inventory_number', 'registration_number', 
    'location', 'note', 'production_date', 'registration_date', 
    'last_service_date', 'service_life', 'time_to_service', 
    'initial_resource', 'remaining_resource', 'installed_in', 
    'node_name', 'node_id', 'created_at', 'updated_at', 'is_deleted',
    'resource_id', 'id', 'write_off_date'
  ];
  
  const mainResult: any[] = [];
  const customResult: any[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    // Пропускаем служебные ключи
    if (excludeKeys.includes(key)) continue;
    if (key === 'measurements') continue;
    if (key.endsWith('_main')) continue;
    
    let displayName = key;
    let val = value;
    let unit = '';
    let isMain = false;
    
    if (value && typeof value === 'object' && 'value' in value) {
      val = (value as any).value;
      unit = (value as any).unit || '';
      isMain = (value as any).is_main || (value as any).isMain || false;
    }
    
    // Красивые имена для стандартных параметров
    if (key === 'U' || key === 'voltage') { displayName = 'Напряжение'; unit = unit || 'В'; }
    else if (key === 'R' || key === 'resistance') { displayName = 'Сопротивление'; unit = unit || 'Ом'; }
    else if (key === 'E') { displayName = 'Ёмкость (E)'; unit = unit || 'Втч'; }
    else if (key === 'C' || key === 'capacity') { displayName = 'Ёмкость (C)'; unit = unit || '%'; }
    else if (key === 'health') { displayName = 'Здоровье'; unit = unit || '%'; }
    else if (key === 'battery_level') { displayName = 'Уровень заряда'; unit = unit || '%'; }
    else if (key === 'operating_hours') { displayName = 'Наработка'; unit = unit || 'ч'; }
    else if (key === 'uptime') { displayName = 'Время работы'; unit = unit || 'ч'; }
    else if (key === 'packet_loss') { displayName = 'Потери пакетов'; unit = unit || '%'; }
    
    mainResult.push({
      name: displayName,
      value: val,
      unit: unit,
      is_main: isMain,
      key: key
    });
  }
  
  parameters.value = mainResult;
  customParams.value = customResult;
}

function goBack() {
  if (props.embedded) {
    emit('back');
    return;
  }
  router.back();
}
function editResource() { formRef.value?.open(resource.value); }

function openAddMeasurementModal() { addMeasurementModalRef.value?.open(resource.value.resource_id); }
function openMeasurementsModal() { measurementsModalRef.value?.open(resource.value.resource_id); }
function refresh() {
  loadData();
  // 👇 ДОБАВИТЬ ЭТО
  setTimeout(() => {
    extractAvailableParams();
  }, 100);
}

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

watch(selectedParam, () => {
  renderChart();
});

watch(() => resource.value?.resource_params?.measurements, () => {
  extractAvailableParams();
  setTimeout(() => renderChart(), 100);
}, { deep: true });

watch(targetResourceId, loadData, { immediate: true });

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  window.removeEventListener('resource-saved', refresh);
  document.removeEventListener('click', handleClickOutside);
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('resource-saved', refresh);
});
</script>

<style scoped>
.info-grid {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.info-row {
  display: grid;
  grid-template-columns: 150px 1fr 150px 1fr;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #e0e4e8;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: #2c3e50;
}

.info-value {
  color: #1a2a3a;
}

/* Блок предупреждений (сворачиваемый) */
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

.alert-item.warning {
  color: #e67e22;
}

/* Ячейка основного параметра в таблице */
.is-main-cell {
  cursor: pointer;
  text-align: center;
}

.is-main-cell:hover {
  background-color: #f0f2f5;
}

/* Кнопка добавления параметра */
.add-param-button {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

/* Стили для графика */
.chart-section {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e4e8;
}

.chart-section h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #2c3e50;
}

.chart-canvas {
  max-width: 600px !important;
  height: 300px !important;
  display: block;
  margin: 0 auto;
}

.chart-controls {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
}

.chart-controls select {
  width: 220px;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
  background: white;
}

/* Кнопки измерений */
.measurement-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

/* Блок примечаний */
.notes-section {
  margin-top: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}
.action-buttons .btn {
  margin-right: 12px;
}
.action-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.action-buttons .btn:last-child {
  margin-right: 0;
}
.notes-section h4 {
  margin-bottom: 8px;
}
.dropdown { position: relative; }
.dropdown-menu { position: absolute; top: 100%; right: 0; margin-top: 4px; background: white; border: 1px solid #e0e4e8; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 100; min-width: 150px; }
.dropdown-item { display: block; width: 100%; padding: 8px 12px; text-align: left; background: none; border: none; cursor: pointer; font-size: 14px; }
.dropdown-item:hover { background-color: #f0f2f5; }
</style>
