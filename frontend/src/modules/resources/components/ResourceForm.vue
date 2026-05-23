<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content" style="width: 750px; max-width: 90vw;">
      <div class="modal-header">{{ isEdit ? 'Редактирование оборудования' : 'Добавление оборудования' }}</div>

      <div class="form-scroll">
        <div class="form-grid">
          <!-- Левая колонка -->
          <div class="form-col">
            <div class="form-group">
              <label>Наименование *</label>
              <input v-model="form.name" class="form-control" :class="{ 'invalid': errors.name }" />
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
              <label>Учётный номер</label>
              <input type="number" v-model="form.registration_number" class="form-control" />
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
                <option value="Списан">Списан</option>
              </select>
            </div>
          </div>

          <!-- Правая колонка -->
          <div class="form-col">
            <div class="form-group">
              <label>Вид узла</label>
              <select v-model="form.node_type_id" class="form-control">
                <option :value="null">-- Не выбран --</option>
                <option value="Агрегат">Агрегат</option>
                <option value="Аккумулятор">Аккумулятор</option>
                <option value="Блок детектирования">Блок детектирования</option>
                <option value="Блок питания">Блок питания</option>
                <option value="Дозиметр">Дозиметр</option>
                <option value="Измерительный блок">Измерительный блок</option>
                <option value="Коммутатор">Коммутатор</option>
                <option value="Осциллограф">Осциллограф</option>
                <option value="Пост контроля">Пост контроля</option>
                <option value="Сервер">Сервер</option>
              </select>
            </div>
            <div class="form-group">
              <label>Установлен в</label>
              <input v-model="form.installed_in" class="form-control" />
            </div>
            <div class="form-group">
              <label>Размещение</label>
              <input v-model="form.location" class="form-control" />
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
            <div class="form-group">
              <label>Режим работы (часов/год)</label>
              <div class="calc-row">
                <input type="number" v-model="workHours" class="form-control" />
                <button type="button" class="btn btn-sm btn-secondary" @click="calculateResource">Рассчитать ресурс</button>
              </div>
            </div>
          </div>
        </div>

        <div class="form-group full-width">
          <label>Примечания</label>
          <textarea v-model="form.note" rows="2" class="form-control"></textarea>
        </div>
      </div>

      <div v-if="calcResult" class="calc-result">
        <h4>Результат расчёта:</h4>
        <p>📊 Рассчитанный остаточный ресурс: <strong>{{ calcResult }}%</strong></p>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? 'Сохранение...' : 'Сохранить' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';

const store = useResourcesStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const saving = ref(false);
const workHours = ref(8760);
const calcResult = ref<string | null>(null);

const errors = reactive({
  name: '',
});

const form = reactive({
  name: '',
  mark: '',
  type: '',
  production_date: '',
  registration_date: '',
  registration_number: null as number | null,
  last_service_date: '',
  node_type_id: null as string | null,
  service_life: null as number | null,
  time_to_service: null as number | null,
  initial_resource: '',
  remaining_resource: '',
  installed_in: '',
  location: '',
  status: 'Получен',
  note: '',
});

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validate(): boolean {
  let isValid = true;
  errors.name = '';
  if (!form.name.trim()) {
    errors.name = 'Введите наименование';
    isValid = false;
  }
  return isValid;
}

async function calculateResource() {
  error.value = '';
  if (!form.node_type_id) {
    error.value = 'Выберите вид узла';
    return;
  }
  if (!form.service_life) {
    error.value = 'Укажите срок службы';
    return;
  }
  try {
    const result = await store.calculateResource(form.node_type_id, workHours.value);
    if (result && result.remaining_resource !== undefined) {
      calcResult.value = result.remaining_resource;
      form.remaining_resource = `${result.remaining_resource}%`;
    }
  } catch (err: any) {
    error.value = err.message || 'Ошибка расчёта';
  }
}

async function save() {
  if (!validate()) return;
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
    status: form.status,
    note: form.note,
  };

  try {
    const nodeId = form.node_type_id || 'temp';
    await store.upsertResource(nodeId, payload);
    close();
    window.dispatchEvent(new Event('resource-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

function open(resource?: any) {
  reset();
  if (resource) {
    isEdit.value = true;
    editId.value = resource.resource_id;
    form.name = resource.name || '';
    form.mark = resource.mark || '';
    form.type = resource.type || '';
    form.production_date = resource.production_date || '';
    form.registration_date = resource.registration_date || getCurrentDate();
    form.registration_number = resource.registration_number || null;
    form.last_service_date = resource.last_service_date || '';
    form.node_type_id = resource.node_type_id || null;
    form.service_life = resource.service_life || null;
    form.time_to_service = resource.time_to_service || null;
    form.initial_resource = resource.initial_resource || '';
    form.remaining_resource = resource.remaining_resource || '';
    form.installed_in = resource.installed_in || '';
    form.location = resource.location || '';
    form.status = resource.status || 'Получен';
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
  form.node_type_id = null;
  form.service_life = null;
  form.time_to_service = null;
  form.initial_resource = '';
  form.remaining_resource = '';
  form.installed_in = '';
  form.location = '';
  form.status = 'Получен';
  form.note = '';
  workHours.value = 8760;
  calcResult.value = null;
  error.value = '';
}

function close() {
  visible.value = false;
}

defineExpose({ open });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
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
.full-width {
  grid-column: span 2;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
.calc-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.calc-row .form-control {
  flex: 1;
}
.calc-result {
  background: #e8f5e9;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 0 16px 16px 16px;
  border-left: 4px solid #27ae60;
}
.calc-result h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
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
  transition: all 0.2s;
  border: none;
}
.btn-primary {
  background: #2c5f8a;
  color: white;
}
.btn-primary:hover:not(:disabled) { background: #1e4566; }
.btn-primary:disabled { background: #9cb3c9; cursor: not-allowed; }
.btn-secondary {
  background: #e9ecef;
  border: 1px solid #ced4da;
  color: #1a2a3a;
}
.btn-secondary:hover { background: #dee2e6; }
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}
</style>