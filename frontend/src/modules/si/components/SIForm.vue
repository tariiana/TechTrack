<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 650px">
      <div class="modal-header">{{ isEdit ? 'Редактирование СИ' : 'Добавление СИ' }}</div>

      <div class="form-row">
        <div class="form-group">
          <label>Наименование*</label>
          <input v-model="form.name" class="form-control" />
        </div>
        <div class="form-group">
          <label>Производитель</label>
          <input v-model="form.manufacturer" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Марка</label>
          <input v-model="form.model" class="form-control" />
        </div>
        <div class="form-group">
          <label>Тип</label>
          <input v-model="form.typeName" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Заводской номер</label>
          <input v-model="form.serialNumber" class="form-control" />
        </div>
        <div class="form-group">
          <label>Инвентарный номер</label>
          <input v-model="form.inventoryNumber" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Табельный номер*</label>
          <input v-model="form.tabNumber" class="form-control" />
        </div>
        <div class="form-group">
          <label>Узел (ID)</label>
          <input v-model="form.nodeId" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.status" class="form-control">
            <option value="в эксплуатации">В эксплуатации</option>
            <option value="на поверке">На поверке</option>
            <option value="в ремонте">В ремонте</option>
            <option value="выведено">Выведено</option>
          </select>
        </div>
        <div class="form-group">
          <label>Размещение</label>
          <input v-model="form.location" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Основные параметры (JSON)</label>
          <textarea 
            v-model="mainParamsStr" 
            rows="4" 
            class="form-control" 
            placeholder='{"напряжение": "12В", "ток": "2А", "мощность": "24Вт"}'
          />
          <small class="text-muted">Введите данные в формате JSON</small>
        </div>
        <div class="form-group">
          <label>Дата производства</label>
          <input type="date" v-model="form.productionDate" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Поверитель</label>
          <input v-model="form.verifier" class="form-control" />
        </div>
        <div class="form-group">
          <label>Межповерочный интервал (лет)*</label>
          <input type="number" step="0.5" v-model="form.verificationInterval" class="form-control" />
        </div>
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.notes" rows="2" class="form-control"></textarea>
      </div>

      <div v-if="jsonError" class="error-text">{{ jsonError }}</div>
      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useSIStore } from '../stores/siStore';

const store = useSIStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const jsonError = ref('');

// Строковое представление JSON для редактирования
const mainParamsStr = ref('{}');

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const form = reactive({
  name: '',
  manufacturer: '',
  model: '',
  typeName: '',
  serialNumber: '',
  inventoryNumber: '',
  tabNumber: '',
  nodeId: undefined as string | undefined,
  status: 'в эксплуатации' as 'в эксплуатации' | 'на поверке' | 'в ремонте' | 'выведено',
  location: '',
  mainParams: {} as Record<string, any>,
  verificationInterval: 1,
  notes: '',
  lastVerificationDate: '',
  productionDate: '',
  verifier: '',
});

// Синхронизация mainParamsStr с form.mainParams
watch(mainParamsStr, (newVal) => {
  try {
    const parsed = JSON.parse(newVal);
    form.mainParams = parsed;
    jsonError.value = '';
  } catch (e) {
    jsonError.value = 'Неверный формат JSON';
  }
});

// При загрузке данных для редактирования
function updateMainParamsStr() {
  if (form.mainParams && Object.keys(form.mainParams).length > 0) {
    mainParamsStr.value = JSON.stringify(form.mainParams, null, 2);
  } else {
    mainParamsStr.value = '{}';
  }
}

function resetForm() {
  form.name = '';
  form.manufacturer = '';
  form.model = '';
  form.typeName = '';
  form.serialNumber = '';
  form.inventoryNumber = '';
  form.tabNumber = '';
  form.nodeId = undefined;
  form.status = 'в эксплуатации';
  form.location = '';
  form.mainParams = {};
  form.verificationInterval = 1;
  form.notes = '';
  form.lastVerificationDate = '';
  form.productionDate = '';
  form.verifier = '';
  mainParamsStr.value = '{}';
  jsonError.value = '';
  error.value = '';
  isEdit.value = false;
  editId.value = null;
}

function open(editItem?: any) {
  resetForm();
  const now = getCurrentDate();
  form.lastVerificationDate = now;

  if (editItem) {
    isEdit.value = true;
    editId.value = editItem.id;
    form.name = editItem.name || '';
    form.manufacturer = editItem.manufacturer || '';
    form.model = editItem.model || '';
    form.typeName = editItem.typeName || '';
    form.serialNumber = editItem.serialNumber || '';
    form.inventoryNumber = editItem.inventoryNumber || '';
    form.tabNumber = editItem.tabNumber || '';
    form.nodeId = editItem.nodeId;
    form.status = editItem.status;
    form.location = editItem.location || '';
    form.mainParams = editItem.mainParams || {};
    form.verificationInterval = editItem.verificationInterval;
    form.notes = editItem.notes || '';
    form.lastVerificationDate = editItem.lastVerificationDate || now;
    form.productionDate = editItem.productionDate || '';
    form.verifier = editItem.verifier || '';
    updateMainParamsStr();
  }
  visible.value = true;
}

function close() {
  visible.value = false;
}

function validate(): boolean {
  if (!form.name) {
    error.value = 'Введите наименование';
    return false;
  }
  if (!form.tabNumber) {
    error.value = 'Введите табельный номер';
    return false;
  }
  if (!form.verificationInterval || form.verificationInterval <= 0) {
    error.value = 'Межповерочный интервал должен быть больше 0';
    return false;
  }
  if (!form.location) {
    error.value = 'Укажите местоположение';
    return false;
  }
  // Проверка JSON
  try {
    JSON.parse(mainParamsStr.value);
  } catch {
    error.value = 'Неверный формат JSON в основных параметрах';
    return false;
  }
  error.value = '';
  return true;
}

async function save() {
  if (!validate()) return;

  // Парсим JSON перед сохранением
  let mainParams = {};
  try {
    mainParams = JSON.parse(mainParamsStr.value);
  } catch {
    error.value = 'Неверный формат JSON';
    return;
  }

  const data = {
    name: form.name,
    manufacturer: form.manufacturer,
    model: form.model,
    typeName: form.typeName,
    serialNumber: form.serialNumber,
    inventoryNumber: form.inventoryNumber,
    tabNumber: form.tabNumber,
    nodeId: form.nodeId,
    status: form.status,
    location: form.location,
    mainParams: mainParams,
    verificationInterval: form.verificationInterval,
    notes: form.notes,
    lastVerificationDate: form.lastVerificationDate,
    productionDate: form.productionDate,
    verifier: form.verifier,
    isDeleted: false,
  };

  if (isEdit.value && editId.value) {
    await store.updateInstrument(editId.value, data);
  } else {
    await store.createInstrument(data);
  }
  close();
  window.dispatchEvent(new Event('si-saved'));
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
.text-muted {
  font-size: 12px;
  color: #6c757d;
  display: block;
  margin-top: 4px;
}
</style>
