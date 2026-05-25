<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 700px">
      <div class="modal-header">
        <span>{{ isEdit ? 'Редактирование СИ' : 'Добавление СИ' }}</span>
        <button class="modal-close" @click="close" title="Закрыть">×</button>
      </div>

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
          <label>Тип*</label>
          <select v-model="form.typeName" class="form-control">
            <option value="" disabled>Выберите тип</option>
            <option v-for="type in store.nodeTypes" :key="type.node_type_id" :value="type.name">
              {{ type.name }}
            </option>
          </select>
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
            <option value="списано">Списано</option>
          </select>
        </div>
        <div class="form-group">
          <label>Местоположение*</label>
          <input v-model="form.location" class="form-control" />
        </div>
      </div>

      <!-- Основные параметры - новая визуальная часть -->
      <div class="form-group">
        <label>Основные параметры</label>
        <div class="params-container">
          <div v-for="(param, index) in paramsList" :key="index" class="param-row">
            <input 
              v-model="param.name" 
              placeholder="Название параметра"
              class="param-name-input"
            />
            <input 
              v-model="param.value" 
              placeholder="Значение"
              class="param-value-input"
            />
            <input 
              v-model="param.unit" 
              placeholder="Ед. измерения"
              class="param-unit-input"
            />
            <button type="button" class="btn-remove" @click="removeParam(index)">×</button>
          </div>
          
          <button type="button" class="btn-add-param" @click="addParam">
            + Добавить параметр
          </button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Дата производства</label>
          <input type="date" v-model="form.productionDate" class="form-control" />
        </div>
        <div class="form-group">
          <label>Поверитель</label>
          <input v-model="form.verifier" class="form-control" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Межповерочный интервал (лет)*</label>
          <input type="number" step="0.5" v-model="form.verificationInterval" class="form-control" />
        </div>
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.notes" rows="2" class="form-control"></textarea>
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
import { ref, reactive, watch, onMounted } from 'vue';
import { useSIStore } from '../stores/siStore';
import { showToast } from '@/utils/toast';

const store = useSIStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');

// Список параметров для отображения
interface ParamItem {
  name: string;
  value: string;
  unit: string;
}

const paramsList = ref<ParamItem[]>([]);

onMounted(() => {
  store.fetchNodeTypes();
});

// Преобразование JSON параметров в список
function paramsFromJson(json: Record<string, any>): ParamItem[] {
  const list: ParamItem[] = [];
  
  for (const [key, rawValue] of Object.entries(json)) {
    let value = String(rawValue);
    let unit = '';
    
    // Пробуем отделить значение от единицы измерения
    const match = value.match(/^([\d.,]+)\s*(.+)$/);
    if (match && match[1] && match[2]) {
      value = match[1];
      unit = match[2].trim();
    }
    
    list.push({
      name: key,
      value: value,
      unit: unit
    });
  }
  
  return list;
}

// Преобразование списка параметров в JSON
function paramsToJson(): Record<string, any> {
  const json: Record<string, any> = {};
  
  for (const param of paramsList.value) {
    if (param.name && param.name.trim() && param.value && param.value.trim()) {
      const name = param.name.trim();
      const value = param.value.trim();
      const unit = param.unit.trim();
      
      if (unit) {
        json[name] = `${value} ${unit}`;
      } else {
        const numValue = parseFloat(value);
        json[name] = isNaN(numValue) ? value : numValue;
      }
    }
  }
  
  return json;
}

function addParam() {
  paramsList.value.push({
    name: '',
    value: '',
    unit: ''
  });
}

function removeParam(index: number) {
  paramsList.value.splice(index, 1);
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
  status: 'в эксплуатации' as 'в эксплуатации' | 'на поверке' | 'в ремонте' | 'списано',
  location: '',
  mainParams: {} as Record<string, any>,
  verificationInterval: 1,
  notes: '',
  lastVerificationDate: '',
  productionDate: '',
  verifier: '',
});

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
  paramsList.value = [];
  error.value = '';
  isEdit.value = false;
  editId.value = null;
}

function open(editItem?: any) {
  resetForm();
  // Убрана автоматическая установка даты lastVerificationDate

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
    form.lastVerificationDate = editItem.lastVerificationDate || '';
    form.productionDate = editItem.productionDate || '';
    form.verifier = editItem.verifier || '';
    paramsList.value = paramsFromJson(form.mainParams);
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
  if (!form.typeName.trim()) {
    error.value = 'Укажите тип средства измерения';
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
  error.value = '';
  return true;
}

async function save() {
  if (!validate()) return;

  const mainParams = paramsToJson();
  
  // Для нового СИ не отправляем lastVerificationDate
  const data: any = {
    name: form.name,
    manufacturer: form.manufacturer,
    model: form.model,
    typeName: form.typeName.trim(),
    serialNumber: form.serialNumber,
    inventoryNumber: form.inventoryNumber,
    tabNumber: form.tabNumber,
    nodeId: form.nodeId,
    status: form.status,
    location: form.location,
    mainParams: mainParams,
    verificationInterval: form.verificationInterval,
    notes: form.notes,
    productionDate: form.productionDate,
    verifier: form.verifier,
    isDeleted: false,
  };
  
  // Добавляем lastVerificationDate только если она есть и это редактирование
  if (isEdit.value && form.lastVerificationDate) {
    data.lastVerificationDate = form.lastVerificationDate;
  }

  try {
    if (isEdit.value && editId.value) {
      await store.updateInstrument(editId.value, data);
      showToast('СИ успешно обновлено', 'success');
    } else {
      await store.createInstrument(data);
      showToast('СИ успешно добавлено', 'success');
    }
    close();
    window.dispatchEvent(new Event('si-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
    showToast(error.value, 'error');
  }
}

defineExpose({ open });
</script>

<style scoped>
/* Стили для параметров */
.params-container {
  border: 1px solid #e0e4e8;
  border-radius: 6px;
  padding: 12px;
  background: #fafbfc;
}
.param-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  align-items: center;
}
.param-row:last-of-type {
  margin-bottom: 0;
}
.param-name-input {
  flex: 2;
  padding: 8px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
}
.param-name-input:focus {
  outline: none;
  border-color: #2c5f8a;
  box-shadow: 0 0 0 2px rgba(44, 95, 138, 0.1);
}
.param-value-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
}
.param-value-input:focus {
  outline: none;
  border-color: #2c5f8a;
  box-shadow: 0 0 0 2px rgba(44, 95, 138, 0.1);
}
.param-unit-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
}
.param-unit-input:focus {
  outline: none;
  border-color: #2c5f8a;
  box-shadow: 0 0 0 2px rgba(44, 95, 138, 0.1);
}
.btn-remove {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #c0392b;
  padding: 0 8px;
  font-weight: bold;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.btn-remove:hover {
  background-color: #ffebee;
  color: #a93226;
}
.btn-add-param {
  width: 100%;
  margin-top: 12px;
  padding: 8px 12px;
  background: none;
  border: 1px dashed #2c5f8a;
  color: #2c5f8a;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.btn-add-param:hover {
  background: #e8f0fe;
  border-color: #2c5f8a;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 4px;
}
.modal-close:hover {
  background-color: #e9ecef;
  color: #333;
}
</style>
