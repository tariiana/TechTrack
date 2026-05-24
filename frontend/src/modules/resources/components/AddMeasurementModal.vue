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

      <!-- Параметры измерения -->
      <div v-if="currentResource" class="params-section">
        <h4>Параметры измерения</h4>
        <div class="params-list">
          <div class="param-row">
            <div class="param-info">
              <span class="param-name">Напряжение (В)</span>
            </div>
            <input type="number" step="0.01" v-model="measurementParams.voltage" class="form-control param-input" />
            <label class="checkbox-label">
              <input type="checkbox" v-model="measurementParams.voltage_main" /> Основной
            </label>
          </div>
          <div class="param-row">
            <div class="param-info">
              <span class="param-name">Внутреннее сопротивление (Ом)</span>
            </div>
            <input type="number" step="0.001" v-model="measurementParams.resistance" class="form-control param-input" />
            <label class="checkbox-label">
              <input type="checkbox" v-model="measurementParams.resistance_main" /> Основной
            </label>
          </div>
          <div class="param-row">
            <div class="param-info">
              <span class="param-name">Ёмкость (%)</span>
            </div>
            <input type="number" step="1" v-model="measurementParams.capacity" class="form-control param-input" />
            <label class="checkbox-label">
              <input type="checkbox" v-model="measurementParams.capacity_main" /> Основной
            </label>
          </div>
        </div>

        <!-- Дополнительные параметры -->
        <div class="custom-params">
          <div class="custom-param-header">
            <span>Дополнительные параметры</span>
            <button type="button" class="btn btn-sm btn-secondary" @click="addCustomParam">+ Добавить параметр</button>
          </div>
          <div v-for="(param, idx) in customParams" :key="idx" class="param-row custom-param-row">
            <input v-model="param.name" placeholder="Название параметра" class="form-control" style="width: 150px" />
            <input v-model="param.value" placeholder="Значение" class="form-control" style="width: 120px" />
            <input v-model="param.unit" placeholder="Ед. изм." class="form-control" style="width: 80px" />
            <label class="checkbox-label">
              <input type="checkbox" v-model="param.is_main" /> Основной
            </label>
            <button type="button" class="btn btn-sm btn-danger" @click="removeCustomParam(idx)">🗑️</button>
          </div>
        </div>
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
import { ref, reactive } from 'vue';
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

const measurementParams = reactive({
  voltage: null as number | null,
  voltage_main: false,
  resistance: null as number | null,
  resistance_main: false,
  capacity: null as number | null,
  capacity_main: false,
});

const customParams = ref<{ name: string; value: string; unit: string; is_main: boolean }[]>([]);

function getParamValue(params: Record<string, any>, key: string): any {
  const value = params?.[key];
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return value.value;
  }
  return value;
}

function getParamFlag(params: Record<string, any>, key: string): boolean {
  const value = params?.[key];
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && (value.is_main || value.isMain));
}

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
      const params = currentResource.value.resource_params || {};
      measurementParams.voltage = getParamValue(params, 'voltage') ?? getParamValue(params, 'U') ?? null;
      measurementParams.voltage_main = getParamFlag(params, 'voltage') || getParamFlag(params, 'U');
      measurementParams.resistance = getParamValue(params, 'resistance') ?? getParamValue(params, 'R') ?? null;
      measurementParams.resistance_main = getParamFlag(params, 'resistance') || getParamFlag(params, 'R');
      measurementParams.capacity = getParamValue(params, 'capacity') ?? getParamValue(params, 'C') ?? getParamValue(params, 'E') ?? null;
      measurementParams.capacity_main = getParamFlag(params, 'capacity') || getParamFlag(params, 'C') || getParamFlag(params, 'E');
    } catch (err) {
      console.error(err);
    }
  } else {
    currentResource.value = null;
    resetParams();
  }
}

function resetParams() {
  measurementParams.voltage = null;
  measurementParams.voltage_main = false;
  measurementParams.resistance = null;
  measurementParams.resistance_main = false;
  measurementParams.capacity = null;
  measurementParams.capacity_main = false;
  customParams.value = [];
}

function addCustomParam() {
  customParams.value.push({ name: '', value: '', unit: '', is_main: false });
}

function removeCustomParam(idx: number) {
  customParams.value.splice(idx, 1);
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
    if (measurement.parameters) {
      measurementParams.voltage = measurement.parameters.voltage ?? measurement.parameters.U ?? null;
      measurementParams.voltage_main = measurement.parameters.voltage_main || false;
      measurementParams.resistance = measurement.parameters.resistance ?? measurement.parameters.R ?? null;
      measurementParams.resistance_main = measurement.parameters.resistance_main || false;
      measurementParams.capacity = measurement.parameters.capacity ?? measurement.parameters.C ?? measurement.parameters.E ?? null;
      measurementParams.capacity_main = measurement.parameters.capacity_main || false;
      if (measurement.parameters.custom) {
        customParams.value = [...measurement.parameters.custom];
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

  const parameters: any = {};
  if (measurementParams.voltage !== null) {
    parameters.voltage = measurementParams.voltage;
    parameters.voltage_main = measurementParams.voltage_main;
  }
  if (measurementParams.resistance !== null) {
    parameters.resistance = measurementParams.resistance;
    parameters.resistance_main = measurementParams.resistance_main;
  }
  if (measurementParams.capacity !== null) {
    parameters.capacity = measurementParams.capacity;
    parameters.capacity_main = measurementParams.capacity_main;
  }
  if (customParams.value.length > 0) {
    parameters.custom = customParams.value;
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

    const updatedParams = { ...params, measurements };
    
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
}
.param-name {
  font-weight: 500;
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
.custom-params {
  margin-top: 15px;
}
.custom-param-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.custom-param-row {
  background: #fff;
  border: 1px solid #e0e4e8;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>
