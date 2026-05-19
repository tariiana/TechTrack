<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 650px">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>

      <div class="form-row">
        <div class="form-group">
          <label>Наименование*</label>
          <input v-model="form.name" class="form-control" :class="{ 'invalid': errors.name }">
          <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
        </div>
        <div class="form-group">
          <label>Марка</label>
          <input v-model="form.mark" class="form-control">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Тип</label>
          <input v-model="form.type" class="form-control">
        </div>
        <div class="form-group">
          <label>Дата производства</label>
          <input type="date" v-model="form.production_date" class="form-control">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Узел*</label>
          <select v-model="form.node_id" class="form-control" :class="{ 'invalid': errors.node_id }">
            <option :value="null">-- Выберите узел --</option>
            <option v-for="node in nodes" :key="node.node_id" :value="node.node_id">
              {{ node.name }}
            </option>
          </select>
          <span v-if="errors.node_id" class="error-text">{{ errors.node_id }}</span>
        </div>
        <div class="form-group">
          <label>Учётный номер</label>
          <input type="number" v-model="form.registration_number" class="form-control">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Срок службы (лет)</label>
          <input type="number" step="0.5" v-model="form.service_life" class="form-control">
        </div>
        <div class="form-group">
          <label>Срок до ТО (лет)</label>
          <input type="number" step="0.5" v-model="form.time_to_service" class="form-control">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Исходный ресурс (%)</label>
          <input type="number" step="1" v-model="form.initial_resource" class="form-control">
        </div>
        <div class="form-group">
          <label>Остаточный ресурс (%)</label>
          <input type="number" step="1" v-model="form.remaining_resource" class="form-control">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Установлен в</label>
          <input v-model="form.installed_in" class="form-control">
        </div>
        <div class="form-group">
          <label>Размещение</label>
          <input v-model="form.location" class="form-control">
        </div>
      </div>

      <div class="form-group">
        <label>Параметры (JSON)</label>
        <textarea v-model="paramsStr" rows="4" class="form-control" placeholder='{"capacity": 85, "voltage": 12.2}'></textarea>
        <small class="text-muted">Введите параметры в формате JSON</small>
      </div>

      <div class="form-group">
        <label>Примечания</label>
        <textarea v-model="form.note" rows="2" class="form-control"></textarea>
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
import { useResourcesStore } from '@/modules/resources/stores/resourcesStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';

const store = useResourcesStore();
const equipmentStore = useEquipmentStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<number | null>(null);
const error = ref('');
const nodes = ref<any[]>([]);

const errors = reactive({
  name: '',
  node_id: '',
});

const form = reactive({
  name: '',
  mark: '',
  type: '',
  production_date: '',
  node_id: null as number | null,
  registration_number: null as number | null,
  service_life: null as number | null,
  time_to_service: null as number | null,
  initial_resource: null as number | null,
  remaining_resource: null as number | null,
  installed_in: '',
  location: '',
  note: '',
});

const paramsStr = ref('{}');

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

function open(resource?: any) {
  reset();
  loadNodes();
  const today = getCurrentDate();

  if (resource) {
    isEdit.value = true;
    editId.value = resource.resource_id;
    form.name = resource.name || '';
    form.mark = resource.mark || '';
    form.type = resource.type || '';
    form.production_date = resource.production_date || '';
    form.node_id = resource.node_id;
    form.registration_number = resource.registration_number || null;
    form.service_life = resource.service_life || null;
    form.time_to_service = resource.time_to_service || null;
    form.initial_resource = resource.initial_resource || null;
    form.remaining_resource = resource.remaining_resource || null;
    form.installed_in = resource.installed_in || '';
    form.location = resource.location || '';
    form.note = resource.note || '';
    paramsStr.value = JSON.stringify(resource.resource_params || {}, null, 2);
  } else {
    form.name = '';
    form.mark = '';
    form.type = '';
    form.production_date = '';
    form.node_id = null;
    form.registration_number = null;
    form.service_life = null;
    form.time_to_service = null;
    form.initial_resource = null;
    form.remaining_resource = null;
    form.installed_in = '';
    form.location = '';
    form.note = '';
    paramsStr.value = '{}';
  }
  visible.value = true;
}

function reset() {
  isEdit.value = false;
  editId.value = null;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!validate()) return;

  let resourceParams = {};
  try {
    resourceParams = JSON.parse(paramsStr.value);
  } catch {
    error.value = 'Неверный формат JSON';
    return;
  }

  const data = {
    name: form.name,
    mark: form.mark,
    type: form.type,
    production_date: form.production_date,
    node_id: form.node_id,
    registration_number: form.registration_number,
    service_life: form.service_life,
    time_to_service: form.time_to_service,
    initial_resource: form.initial_resource,
    remaining_resource: form.remaining_resource,
    installed_in: form.installed_in,
    location: form.location,
    registration_date: getCurrentDate(),
    resource_params: resourceParams,
    note: form.note,
  };

  try {
    if (isEdit.value && editId.value) {
      await store.updateResource(editId.value, data);
    } else {
      await store.createResource(data);
    }
    close();
    window.dispatchEvent(new Event('resource-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  }
}

defineExpose({ open });
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.form-row .form-group {
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
.text-muted {
  font-size: 12px;
  color: #6c757d;
  display: block;
  margin-top: 4px;
}
</style>