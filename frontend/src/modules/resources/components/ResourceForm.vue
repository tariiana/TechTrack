<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 700px">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>

      <div class="form-grid">
        <div class="form-group">
          <label>Наименование*</label>
          <input v-model="form.name" class="form-control" :class="{ 'invalid': errors.name }">
          <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
        </div>
        <div class="form-group">
          <label>Марка</label>
          <input v-model="form.mark" class="form-control">
        </div>

        <div class="form-group">
          <label>Тип</label>
          <input v-model="form.type" class="form-control">
        </div>
        <div class="form-group">
          <label>Дата производства</label>
          <input type="date" v-model="form.production_date" class="form-control">
        </div>

        <div class="form-group">
          <label>Дата регистрации*</label>
          <input type="date" v-model="form.registration_date" class="form-control">
        </div>
        <div class="form-group">
          <label>Учётный номер</label>
          <input type="number" v-model="form.registration_number" class="form-control">
        </div>

        <div class="form-group">
          <label>Дата последнего ТО</label>
          <input type="date" v-model="form.last_service_date" class="form-control">
        </div>
        <div class="form-group">
          <label>Узел</label>
          <select v-model="form.node_id" class="form-control" :class="{ 'invalid': errors.node_id }">
            <option :value="null">-- Выберите узел --</option>
            <option v-for="node in nodes" :key="node.node_id" :value="node.node_id">
              {{ node.name }} ({{ node.type === 'aggregate' ? 'Агрегат' : 'Блок' }})
            </option>
          </select>
          <span v-if="errors.node_id" class="error-text">{{ errors.node_id }}</span>
        </div>

        <div class="form-group">
          <label>Срок службы (лет)</label>
          <input type="number" step="0.5" v-model="form.service_life" class="form-control">
        </div>
        <div class="form-group">
          <label>Срок до ТО (лет)</label>
          <input type="number" step="0.5" v-model="form.time_to_service" class="form-control">
        </div>

        <div class="form-group">
          <label>Исходный ресурс</label>
          <input v-model="form.initial_resource" class="form-control" placeholder="200 Втч">
        </div>
        <div class="form-group">
          <label>Остаточный ресурс</label>
          <input v-model="form.remaining_resource" class="form-control" placeholder="150 Втч">
        </div>

        <div class="form-group">
          <label>Установлен в</label>
          <input v-model="form.installed_in" class="form-control" placeholder="Пост контроля РО 147">
        </div>
        <div class="form-group">
          <label>Режим работы (часов/год)</label>
          <div class="calc-row">
            <input type="number" v-model="workHours" class="form-control">
            <button type="button" class="btn btn-sm btn-secondary" @click="calculateResource">Рассчитать ресурс</button>
          </div>
        </div>

        <div class="form-group full-width">
          <label>Примечания</label>
          <textarea v-model="form.note" rows="2" class="form-control"></textarea>
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
import { ref, reactive, onMounted } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';

const store = useResourcesStore();
const equipmentStore = useEquipmentStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const nodes = ref<any[]>([]);
const workHours = ref(8760);

const errors = reactive({
  name: '',
  node_id: '',
});

const form = reactive({
  name: '',
  mark: '',
  type: '',
  production_date: '',
  registration_date: '',
  registration_number: null as number | null,
  last_service_date: '',
  node_id: null as string | null,
  service_life: null as number | null,
  time_to_service: null as number | null,
  initial_resource: '',
  remaining_resource: '',
  installed_in: '',
  note: '',
});

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function loadNodes() {
  await equipmentStore.fetchNodes();
  nodes.value = equipmentStore.nodes;
}

function validate(): boolean {
  let isValid = true;
  errors.name = '';
  errors.node_id = '';

  if (!form.name.trim()) {
    errors.name = 'Введите наименование';
    isValid = false;
  }
  if (!form.node_id) {
    errors.node_id = 'Выберите узел';
    isValid = false;
  }

  return isValid;
}

async function calculateResource() {
  if (!form.node_id) {
    error.value = 'Сначала выберите узел';
    return;
  }
  try {
    const result = await store.calculateResource(form.node_id, workHours.value);
    if (result && result.remaining_resource !== undefined) {
      form.remaining_resource = result.remaining_resource;
    }
    if (result && result.time_to_service !== undefined) {
      form.time_to_service = result.time_to_service;
    }
    error.value = '';
  } catch (err: any) {
    error.value = err.message || 'Ошибка расчёта ресурса';
  }
}

async function save() {
  if (!validate()) return;

  const payload = {
    name: form.name,
    mark: form.mark,
    type: form.type,
    production_date: form.production_date,
    registration_date: form.registration_date || getCurrentDate(),
    registration_number: form.registration_number,
    last_service_date: form.last_service_date,
    service_life: form.service_life,
    time_to_service: form.time_to_service,
    initial_resource: form.initial_resource,
    remaining_resource: form.remaining_resource,
    installed_in: form.installed_in,
    note: form.note,
  };

  try {
    if (form.node_id) {
      await store.upsertResource(form.node_id, payload);
    }
    close();
    window.dispatchEvent(new Event('resource-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  }
}

function open(resource?: any) {
  reset();
  loadNodes();
  if (resource) {
    isEdit.value = true;
    editId.value = resource.node_id;
    form.name = resource.name || '';
    form.mark = resource.mark || '';
    form.type = resource.type || '';
    form.production_date = resource.production_date || '';
    form.registration_date = resource.registration_date || getCurrentDate();
    form.registration_number = resource.registration_number || null;
    form.last_service_date = resource.last_service_date || '';
    form.node_id = resource.node_id;
    form.service_life = resource.service_life || null;
    form.time_to_service = resource.time_to_service || null;
    form.initial_resource = resource.initial_resource || '';
    form.remaining_resource = resource.remaining_resource || '';
    form.installed_in = resource.installed_in || '';
    form.note = resource.note || '';
  }
  visible.value = true;
}

function reset() {
  isEdit.value = false;
  editId.value = null;
  form.name = '';
  form.mark = '';
  form.type = '';
  form.production_date = '';
  form.registration_date = getCurrentDate();
  form.registration_number = null;
  form.last_service_date = '';
  form.node_id = null;
  form.service_life = null;
  form.time_to_service = null;
  form.initial_resource = '';
  form.remaining_resource = '';
  form.installed_in = '';
  form.note = '';
  workHours.value = 8760;
  error.value = '';
}

function close() {
  visible.value = false;
}

defineExpose({ open });
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}
.full-width {
  grid-column: span 2;
}
.calc-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.calc-row .form-control {
  flex: 1;
}
.invalid {
  border-color: #c0392b !important;
  background-color: #ffe0e0;
}
.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
</style>