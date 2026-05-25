<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 650px">
      <div class="modal-header">{{ editMode ? 'Редактирование измерения' : 'Добавление измерения' }}</div>

      <div class="form-group">
        <label>Выберите ресурс*</label>
        <select v-model="selectedResourceId" class="form-control" @change="onResourceSelect">
          <option :value="null">-- Выберите --</option>
          <option v-for="res in resources" :key="res.resource_id" :value="res.resource_id">
            {{ res.name }} ({{ res.mark || '' }} | уч.№ {{ res.registration_number || '' }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Дата измерения*</label>
        <input type="date" v-model="form.measurementDate" class="form-control" />
      </div>

      <!-- Параметры измерения (только те, что есть в таблице параметров) -->
      <div v-if="currentResource && displayParams.length" class="params-section">
        <h4>Параметры измерения</h4>
        <div class="params-list">
          <div v-for="param in displayParams" :key="param.key" class="param-row">
            <div class="param-info">
              <span class="param-name">{{ param.name }}</span>
              <span class="param-unit" v-if="param.unit">({{ param.unit }})</span>
            </div>
            <input 
              type="number" 
              step="any" 
              v-model="paramValues[param.key]" 
              class="form-control param-input"
              :placeholder="`Текущее: ${param.currentValue || '-'}`"
            />
            <label class="checkbox-label">
              <input type="checkbox" v-model="paramIsMain[param.key]" /> Основной
            </label>
          </div>
        </div>
      </div>
      <div v-else-if="currentResource && displayParams.length === 0" class="empty-params">
        Нет параметров для измерения
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';

const store = useResourcesStore();
const visible = ref(false);
const editMode = ref(false);
const editId = ref<number | string | null>(null);
const selectedResourceId = ref<string | null>(null);
const error = ref('');
const resources = ref<any[]>([]);
const currentResource = ref<any>(null);
const resourceIdFromCard = ref<string | null>(null);

const form = reactive({
  measurementDate: '',
});

// Хранилище значений параметров по ключам
const paramValues = reactive<Record<string, number | null>>({});
const paramIsMain = reactive<Record<string, boolean>>({});

// Список параметров для отображения (только те, что есть в таблице параметров ресурса)
const displayParams = computed(() => {
  if (!currentResource.value) return [];
  
  const params = currentResource.value.resource_params || {};
  const result: any[] = [];
  
  // Определяем соответствие ключей и отображаемых имён
  const paramMapping: Record<string, { name: string; unit: string }> = {
    'U': { name: 'Напряжение', unit: 'В' },
    'R': { name: 'Сопротивление', unit: 'Ом' },
    'E': { name: 'Ёмкость (E)', unit: '%' },
    'C': { name: 'Ёмкость (C)', unit: '%' },
  };
  
  // Собираем основные параметры (только если они есть в ресурсе)
  for (const [key, mapping] of Object.entries(paramMapping)) {
    if (params[key] !== undefined) {
      const v = params[key];
      const currentValue = v && typeof v === 'object' && 'value' in v ? v.value : v;
      const isMain = v && typeof v === 'object' ? v.is_main || v.isMain || false : false;
      
      result.push({
        key: key,
        name: mapping.name,
        unit: mapping.unit,
        currentValue: currentValue,
        isMain: isMain,
      });
    }
  }
  
  // Собираем дополнительные параметры (исключая служебные поля)
  const excludedKeys = ['measurements', 'status', 'U', 'R', 'E', 'C', 'voltage', 'resistance', 'capacity'];
  // Служебные поля, которые не должны отображаться
  const systemKeys = ['mark', 'name', 'type', 'manufacturer', 'model', 'serial_number', 
                       'inventory_number', 'registration_number', 'location', 'note',
                       'production_date', 'registration_date', 'last_service_date',
                       'service_life', 'time_to_service', 'initial_resource', 
                       'remaining_resource', 'installed_in', 'node_name', 'node_id'];
  
  for (const [key, value] of Object.entries(params)) {
    // Пропускаем служебные ключи
    if (excludedKeys.includes(key)) continue;
    if (systemKeys.includes(key)) continue;
    // Пропускаем русские названия основных параметров
    if (key === 'Напряжение' || key === 'Сопротивление' || key === 'Ёмкость') continue;
    
    const v = value as any;
    if (v === null || v === undefined) continue;
    
    const currentValue = v && typeof v === 'object' && 'value' in v ? v.value : v;
    const unit = v && typeof v === 'object' ? v.unit || '' : '';
    const isMain = v && typeof v === 'object' ? v.is_main || v.isMain || false : false;
    
    result.push({
      key: key,
      name: key,
      unit: unit,
      currentValue: currentValue,
      isMain: isMain,
    });
  }
  
  return result;
});

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadResources() {
  await store.fetchResources();
  resources.value = store.resources;
  if (resourceIdFromCard.value) {
    selectedResourceId.value = resourceIdFromCard.value;
    await onResourceSelect();
  }
}

async function onResourceSelect() {
  if (selectedResourceId.value) {
    try {
      currentResource.value = await store.fetchResourceById(selectedResourceId.value);
      // Очищаем старые значения
      Object.keys(paramValues).forEach(key => delete paramValues[key]);
      Object.keys(paramIsMain).forEach(key => delete paramIsMain[key]);
      
      // Инициализируем значения параметров текущими значениями из ресурса
      for (const param of displayParams.value) {
        if (paramValues[param.key] === undefined) {
          paramValues[param.key] = param.currentValue !== null && param.currentValue !== undefined ? Number(param.currentValue) : null;
        }
        if (paramIsMain[param.key] === undefined) {
          paramIsMain[param.key] = param.isMain;
        }
      }
    } catch (err) {
      console.error(err);
    }
  } else {
    currentResource.value = null;
    resetParams();
  }
}

function resetParams() {
  Object.keys(paramValues).forEach(key => delete paramValues[key]);
  Object.keys(paramIsMain).forEach(key => delete paramIsMain[key]);
}

function reset() {
  selectedResourceId.value = null;
  currentResource.value = null;
  form.measurementDate = getCurrentDate();
  error.value = '';
  editMode.value = false;
  editId.value = null;
  resetParams();
}

async function open(resourceId?: string, measurement?: any) {
  resourceIdFromCard.value = resourceId || null;
  reset();
  await loadResources();
  
  if (measurement) {
    editMode.value = true;
    editId.value = measurement.id;
    selectedResourceId.value = measurement.resourceId;
    await onResourceSelect();
    form.measurementDate = measurement.measurementDate;
    
    // Загружаем значения из существующего измерения
    if (measurement.parameters) {
      for (const param of displayParams.value) {
        let value = null;
        if (param.key === 'U') value = measurement.parameters.U ?? measurement.parameters.voltage;
        else if (param.key === 'R') value = measurement.parameters.R ?? measurement.parameters.resistance;
        else if (param.key === 'E') value = measurement.parameters.E;
        else if (param.key === 'C') value = measurement.parameters.C;
        else value = measurement.parameters[param.key];
        
        if (value !== undefined && value !== null) {
          paramValues[param.key] = Number(value);
        }
        
        const mainFlag = measurement.parameters[`${param.key}_main`];
        if (mainFlag !== undefined) {
          paramIsMain[param.key] = mainFlag;
        }
      }
    }
  }
  visible.value = true;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!selectedResourceId.value) {
    error.value = 'Выберите ресурс';
    return;
  }
  if (!form.measurementDate) {
    error.value = 'Укажите дату измерения';
    return;
  }

  // Собираем параметры для измерения (только те, что есть в displayParams)
  const parameters: any = {};
  for (const param of displayParams.value) {
    const value = paramValues[param.key];
    if (value !== null && value !== undefined) {
      // Сохраняем значение
      if (param.key === 'U') {
        parameters.U = value;
        parameters.voltage = value;
      } else if (param.key === 'R') {
        parameters.R = value;
        parameters.resistance = value;
      } else if (param.key === 'E') {
        parameters.E = value;
      } else if (param.key === 'C') {
        parameters.C = value;
      } else {
        parameters[param.key] = value;
      }
      
      // Сохраняем флаг основного параметра
      parameters[`${param.key}_main`] = paramIsMain[param.key] || false;
    }
  }

  const newMeasurement = {
    measurement_date: form.measurementDate,
    parameters,
  };

  try {
    const fullResource = await store.fetchResourceById(selectedResourceId.value);
    const params = fullResource.resource_params || {};
    let measurements = params.measurements || [];

    if (editMode.value && editId.value) {
      const index = measurements.findIndex((m: any) => String(m.id) === String(editId.value));
      if (index !== -1) {
        measurements[index] = { ...measurements[index], ...newMeasurement };
      }
    } else {
      const newId = Date.now();
      measurements.push({ id: newId, ...newMeasurement });
    }

    // Обновляем параметры ресурса на основе последнего измерения
    const updatedParams = { ...params, measurements };
    
    // Обновляем текущие значения параметров в resource_params
    for (const param of displayParams.value) {
      const value = paramValues[param.key];
      if (value !== null && value !== undefined) {
        if (param.key === 'U') {
          updatedParams.U = { value: value, unit: 'В', is_main: paramIsMain[param.key] };
          updatedParams.voltage = { value: value, unit: 'В', is_main: paramIsMain[param.key] };
        } else if (param.key === 'R') {
          updatedParams.R = { value: value, unit: 'Ом', is_main: paramIsMain[param.key] };
          updatedParams.resistance = { value: value, unit: 'Ом', is_main: paramIsMain[param.key] };
        } else if (param.key === 'E') {
          updatedParams.E = { value: value, unit: '%', is_main: paramIsMain[param.key] };
        } else if (param.key === 'C') {
          updatedParams.C = { value: value, unit: '%', is_main: paramIsMain[param.key] };
        } else {
          updatedParams[param.key] = { value: value, unit: param.unit || '', is_main: paramIsMain[param.key] };
        }
      }
    }
    
    const payload = {
      name: fullResource.name,
      mark: fullResource.mark,
      type: fullResource.type,
      production_date: fullResource.production_date,
      registration_number: fullResource.registration_number,
      service_life: fullResource.service_life,
      time_to_service: fullResource.time_to_service,
      initial_resource: fullResource.initial_resource,
      remaining_resource: fullResource.remaining_resource,
      installed_in: fullResource.installed_in,
      location: fullResource.location,
      note: fullResource.note,
      resource_params: updatedParams,
    };
    
    await store.upsertResource(selectedResourceId.value, payload);
    close();
    window.dispatchEvent(new Event('resource-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  }
}

defineExpose({ open });
</script>

<style scoped>
/* Уникальные стили модального окна измерения (нет в глобальных) */
.params-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e4e8;
}

.params-section h4 {
  margin-bottom: 15px;
  font-size: 14px;
  color: #2c3e50;
}

.params-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.param-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
}

.param-name {
  font-weight: 500;
}

.param-unit {
  font-size: 12px;
  color: #6c757d;
}

.param-input {
  width: 120px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.empty-params {
  text-align: center;
  padding: 20px;
  color: #999;
  font-style: italic;
}

/* Переопределение ширины модального окна */
.modal-content {
  width: 650px;
}
</style>