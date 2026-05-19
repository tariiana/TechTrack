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
        <h4>Параметры ресурса</h4>
        <div class="params-list">
          <div v-for="(value, key) in currentResourceParams" :key="key" class="param-row">
            <div class="param-info">
              <span class="param-name">{{ key }}</span>
              <span class="param-unit">({{ getUnitHint(key) }})</span>
            </div>
            <input
              type="number"
              step="0.01"
              v-model="currentResourceParams[key]"
              class="form-control param-input"
            />
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
const editId = ref<number | null>(null);
const selectedResourceId = ref<number | null>(null);
const error = ref('');
const resources = ref<any[]>([]);
const currentResource = ref<any>(null);
const currentResourceParams = ref<Record<string, number>>({});

const form = reactive({
  measurementDate: '',
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
}

async function loadResourceParams(resourceId: number) {
  try {
    const fullResource = await store.fetchResourceById(resourceId);
    currentResource.value = fullResource;
    const params = fullResource.resource_params || {};
    // Извлекаем текущие значения параметров (игнорируем служебные поля)
    const { measurements, ...paramValues } = params;
    currentResourceParams.value = paramValues;
  } catch (err) {
    console.error(err);
  }
}

function onResourceSelect() {
  if (selectedResourceId.value) {
    loadResourceParams(selectedResourceId.value);
  } else {
    currentResource.value = null;
    currentResourceParams.value = {};
  }
}

function getUnitHint(key: string): string {
  const units: Record<string, string> = {
    capacity: '%',
    voltage: 'В',
    resistance: 'Ом',
    remainingLife: 'лет',
  };
  return units[key] || '';
}

function reset() {
  selectedResourceId.value = null;
  currentResource.value = null;
  currentResourceParams.value = {};
  form.measurementDate = getCurrentDate();
  error.value = '';
  editMode.value = false;
  editId.value = null;
}

async function open(measurement?: any) {
  reset();
  await loadResources();
  if (measurement) {
    editMode.value = true;
    editId.value = measurement.measurement_id;
    selectedResourceId.value = measurement.resource_id;
    await loadResourceParams(measurement.resource_id);
    form.measurementDate = measurement.measurement_date;
    // восстановить значения параметров из измерения
    if (measurement.parameters) {
      for (const [key, val] of Object.entries(measurement.parameters)) {
        if (currentResourceParams.value.hasOwnProperty(key)) {
          currentResourceParams.value[key] = val as number;
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

  const resourceId = selectedResourceId.value;
  const newMeasurement = {
    measurement_date: form.measurementDate,
    parameters: { ...currentResourceParams.value },
  };

  try {
    const fullResource = await store.fetchResourceById(resourceId);
    const params = fullResource.resource_params || {};
    let measurements = params.measurements || [];

    if (editMode.value && editId.value) {
      const index = measurements.findIndex((m: any) => m.measurement_id === editId.value);
      if (index !== -1) {
        measurements[index] = { ...measurements[index], ...newMeasurement };
      }
    } else {
      const newId = Date.now();
      measurements.push({ measurement_id: newId, ...newMeasurement });
    }

    const updatedParams = {
      ...currentResourceParams.value,
      measurements: measurements,
    };

    await store.updateResource(resourceId, { resource_params: updatedParams });
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
  max-height: 300px;
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
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>