<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>

      <div class="form-scroll">
        <div class="form-grid">
          <div class="form-col">
            <div class="form-group">
              <label>Узел *</label>
              <select v-model="form.node_id" class="form-control" :class="{ invalid: errors.node_id }" :disabled="isEdit">
                <option :value="null">-- Выберите узел --</option>
                <option v-for="node in nodes" :key="node.node_id" :value="node.node_id">
                  {{ node.name || node.model || node.node_id }}
                </option>
              </select>
              <span v-if="errors.node_id" class="error-text">{{ errors.node_id }}</span>
            </div>

            <div class="form-group">
              <label>Наименование *</label>
              <input v-model="form.name" class="form-control" :class="{ invalid: errors.name }" />
              <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
            </div>

            <div class="form-group">
              <label>Марка</label>
              <input v-model="form.mark" class="form-control" />
            </div>

            <div class="form-group">
              <label>Тип</label>
              <input v-model="form.type" class="form-control" />
            </div>

            <div class="form-group">
              <label>Дата производства</label>
              <input type="date" v-model="form.production_date" class="form-control" />
            </div>

            <div class="form-group">
              <label>Учетный номер</label>
              <input v-model="form.registration_number" class="form-control" />
            </div>
          </div>

          <div class="form-col">
            <div class="form-group">
              <label>Установлен в</label>
              <input v-model="form.installed_in" class="form-control" />
            </div>

            <div class="form-group">
  <label>Статус</label>
  <select v-model="form.status" class="form-control">
    <option value="Получен">Получен</option>
    <option value="Исправен">Исправен</option>
    <option value="Неисправен">Неисправен</option>
    <option value="В ремонте">В ремонте</option>
    <option value="На поверке">На поверке</option>
    <option value="Законсервирован">Законсервирован</option>
    <option value="списан">Списан</option>
  </select>
</div>
            <div class="form-group">
              <label>Размещение</label>
              <input v-model="form.location" class="form-control" />
            </div>

            <div class="form-group">
              <label>Дата регистрации</label>
              <input type="date" v-model="form.registration_date" class="form-control" />
            </div>

            <div class="form-group">
              <label>Дата последнего ТО</label>
              <input type="date" v-model="form.last_service_date" class="form-control" />
            </div>

            <div class="form-group">
              <label>Срок службы (лет)</label>
              <input type="number" step="0.5" v-model="form.service_life" class="form-control" />
            </div>

            <div class="form-group">
              <label>Срок до ТО (лет)</label>
              <input type="number" step="0.5" v-model="form.time_to_service" class="form-control" />
            </div>

            <div class="form-group">
              <label>Исходный ресурс</label>
              <input v-model="form.initial_resource" class="form-control" />
            </div>

            <div class="form-group">
              <label>Остаточный ресурс</label>
              <input v-model="form.remaining_resource" class="form-control" />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Режим работы (часов/год)</label>
          <div class="calc-row">
            <input type="number" v-model="workHours" class="form-control" />
            <button type="button" class="btn btn-sm btn-secondary" @click="calculateResource">Рассчитать ресурс</button>
          </div>
        </div>

        <div class="form-group">
          <label>Примечание</label>
          <textarea v-model="form.note" rows="2" class="form-control"></textarea>
        </div>
      </div>

      <div v-if="calcResult !== null" class="calc-result">
        Рассчитанный остаточный ресурс: <strong>{{ calcResult }}%</strong>
      </div>

      <div v-if="error" class="error-text form-error">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';

const store = useResourcesStore();
const equipmentStore = useEquipmentStore();

const visible = ref(false);
const isEdit = ref(false);
const error = ref('');
const saving = ref(false);
const workHours = ref(8760);
const calcResult = ref<number | null>(null);
const nodes = ref<any[]>([]);

const errors = reactive({
  name: '',
  node_id: '',
});

const form = reactive({
  node_id: null as string | null,
  name: '',
  mark: '',
  type: '',
  production_date: '',
  registration_date: '',
  registration_number: '',
  last_service_date: '',
  service_life: null as number | null,
  time_to_service: null as number | null,
  initial_resource: '',
  remaining_resource: '',
  installed_in: '',
  location: '',
  note: '',
  status: 'Исправен',
});

function normalizeFormStatus(status: any): string {
  const value = String(status || '').trim();
  const legacyMap: Record<string, string> = {
    'активный': 'Получен',
    'на обслуживании': 'Исправен',
    'ремонт': 'В ремонте',
    'Списан': 'списан',
  };
  return legacyMap[value] || value || 'Исправен';
}

function getCurrentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function reset() {
  isEdit.value = false;
  form.node_id = null;
  form.name = '';
  form.mark = '';
  form.type = '';
  form.production_date = '';
  form.registration_date = getCurrentDate();
  form.registration_number = '';
  form.last_service_date = '';
  form.service_life = null;
  form.time_to_service = null;
  form.initial_resource = '';
  form.remaining_resource = '';
  form.installed_in = '';
  form.location = '';
  form.note = '';
  form.status = 'Получен';
  workHours.value = 8760;
  calcResult.value = null;
  error.value = '';
  errors.name = '';
  errors.node_id = '';
}

async function loadNodes() {
  await equipmentStore.fetchNodes();
  nodes.value = equipmentStore.rawNodes || equipmentStore.nodes || [];
}

function validate(): boolean {
  errors.name = '';
  errors.node_id = '';

  if (!form.node_id) errors.node_id = 'Выберите узел';
  if (!form.name.trim()) errors.name = 'Введите наименование';

  return !errors.name && !errors.node_id;
}

async function calculateResource() {
  error.value = '';
  if (!form.node_id) {
    error.value = 'Сначала выберите узел';
    return;
  }

  try {
    const result = await store.calculateResource(form.node_id, workHours.value);
    const remaining = result?.remaining_resource ?? result?.calculated_resource_percent;
    if (remaining !== undefined && remaining !== null) {
      calcResult.value = Number(remaining);
      form.remaining_resource = String(remaining);
    }
    if (result?.time_to_service !== undefined && result.time_to_service !== null) {
      form.time_to_service = result.time_to_service;
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка расчета ресурса';
  }
}

async function save() {
  if (!validate() || !form.node_id) return;
  saving.value = true;
  error.value = '';

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
    location: form.location,
    note: form.note,
      status: form.status, // 👈 ДОБАВИТЬ
   isDeleted: false,
  };

  try {
    await store.upsertResource(form.node_id, payload);
    close();
    window.dispatchEvent(new Event('resource-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function open(resource?: any) {
  reset();
  await loadNodes();

  if (resource) {
    isEdit.value = true;
    form.node_id = resource.node_id || resource.resource_id || null;
    form.name = resource.name || '';
    form.mark = resource.mark || '';
    form.type = resource.type || '';
    form.production_date = resource.production_date || '';
    form.registration_date = resource.registration_date || getCurrentDate();
    form.registration_number = resource.registration_number || '';
    form.last_service_date = resource.last_service_date || '';
    form.service_life = resource.service_life || null;
    form.time_to_service = resource.time_to_service || null;
    form.initial_resource = resource.initial_resource ?? '';
    form.remaining_resource = resource.remaining_resource ?? '';
    form.installed_in = resource.installed_in || '';
    form.location = resource.location || '';
    form.note = resource.note || '';
    form.status = normalizeFormStatus(resource.status);  
  }

  visible.value = true;
}

function close() {
  visible.value = false;
}

defineExpose({ open });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  width: 750px;
  max-width: 90vw;
  max-height: 90vh;
  background: white;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e4e8;
  font-weight: 600;
  font-size: 18px;
}
.form-scroll {
  overflow-y: auto;
  padding: 16px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.form-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.form-group label {
  font-weight: 500;
  font-size: 14px;
}
.form-control {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
}
.calc-row {
  display: flex;
  gap: 8px;
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
}
.form-error {
  padding: 0 16px;
}
.calc-result {
  background: #e8f5e9;
  padding: 12px 16px;
  margin: 0 16px 16px;
  border-left: 4px solid #27ae60;
}
.modal-footer {
  padding: 16px;
  border-top: 1px solid #e0e4e8;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  border: none;
}
.btn-primary {
  background: #2c5f8a;
  color: white;
}
.btn-primary:disabled {
  background: #9cb3c9;
  cursor: not-allowed;
}
.btn-secondary {
  background: #e9ecef;
  border: 1px solid #ced4da;
  color: #1a2a3a;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
