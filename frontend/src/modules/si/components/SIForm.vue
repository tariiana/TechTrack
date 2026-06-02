<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 750px">
      <div class="modal-header">
        <span>{{ isEdit ? 'Редактирование СИ' : 'Добавление СИ' }}</span>
        <button class="modal-close" @click="confirmClose" title="Закрыть">×</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Наименование <span class="required">*</span></label>
          <input v-model="form.name" class="form-control" placeholder="Введите наименование" />
        </div>
        <div class="form-group">
          <label>Производитель</label>
          <input v-model="form.manufacturer" class="form-control" placeholder="Например: НПП Доза" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Марка</label>
          <input v-model="form.model" class="form-control" placeholder="Модель прибора" />
        </div>
        <div class="form-group">
          <label>Тип <span class="required">*</span></label>
          <input v-model="form.typeName" class="form-control" placeholder="Например: Дозиметр" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Заводской номер</label>
          <input v-model="form.serialNumber" class="form-control" placeholder="Серийный номер" />
        </div>
        <div class="form-group">
          <label>Инвентарный номер</label>
          <input v-model="form.inventoryNumber" class="form-control" placeholder="Инвентарный номер" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Табельный номер <span class="required">*</span></label>
          <input v-model="form.tabNumber" class="form-control" placeholder="Табельный номер" />
        </div>
        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.status" class="form-control">
            <option value="в эксплуатации">В эксплуатации</option>
            <option value="на поверке">На поверке</option>
            <option value="в ремонте">В ремонте</option>
            <option value="списано">Списано</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Местоположение <span class="required">*</span></label>
          <input v-model="form.location" class="form-control" placeholder="Где находится прибор" />
        </div>
        <div class="form-group">
          <label>Межповерочный интервал <span class="required">*</span></label>
          <input type="number" step="0.5" v-model="form.verificationInterval" class="form-control" placeholder="лет" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Дата производства</label>
          <input type="date" v-model="form.productionDate" class="form-control" />
        </div>
        <div class="form-group"></div>
      </div>

      <!-- Основные параметры -->
      <div class="form-group">
        <label>Основные параметры</label>
        <div class="params-container">
          <div v-for="(param, index) in paramsList" :key="index" class="param-row">
            <input v-model="param.name" placeholder="Название" class="param-name-input" />
            <input v-model="param.value" placeholder="Значение" class="param-value-input" />
            <input v-model="param.unit" placeholder="Ед. изм." class="param-unit-input" />
            <button type="button" class="btn-remove" @click="removeParam(index)">✕</button>
          </div>
          <button type="button" class="btn-add-param" @click="addParam">+ Добавить параметр</button>
        </div>
        <small class="text-muted">Добавьте технические характеристики прибора</small>
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.notes" rows="2" class="form-control" placeholder="Дополнительная информация"></textarea>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="confirmClose">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
  <ConfirmDialog ref="confirmDialog" />
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed  } from 'vue';
import { useSIStore } from '../stores/siStore';
import { showToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const store = useSIStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const confirmDialog = ref();

interface ParamItem {
  name: string;
  value: string;
  unit: string;
}

const paramsList = ref<ParamItem[]>([]);


function paramsFromJson(json: Record<string, any>): ParamItem[] {
  const list: ParamItem[] = [];
  for (const [key, rawValue] of Object.entries(json)) {
    let value = String(rawValue);
    let unit = '';
    const match = value.match(/^([\d.,]+)\s*(.+)$/);
    if (match && match[1] && match[2]) {
      value = match[1];
      unit = match[2].trim();
    }
    list.push({ name: key, value, unit });
  }
  return list;
}

function paramsToJson(): Record<string, any> {
  const json: Record<string, any> = {};
  for (const param of paramsList.value) {
    if (param.name?.trim() && param.value?.trim()) {
      const name = param.name.trim();
      const value = param.value.trim();
      const unit = param.unit.trim();
      if (unit) json[name] = `${value} ${unit}`;
      else {
        const numValue = parseFloat(value);
        json[name] = isNaN(numValue) ? value : numValue;
      }
    }
  }
  return json;
}

function addParam() {
  paramsList.value.push({ name: '', value: '', unit: '' });
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
  status: 'в эксплуатации' as 'в эксплуатации' | 'на поверке' | 'в ремонте' | 'списано',
  location: '',
  mainParams: {} as Record<string, any>,
  verificationInterval: 1,
  notes: '',
  lastVerificationDate: '',
  productionDate: '',
});

function resetForm() {
  form.name = '';
  form.manufacturer = '';
  form.model = '';
  form.typeName = '';
  form.serialNumber = '';
  form.inventoryNumber = '';
  form.tabNumber = '';
  form.status = 'в эксплуатации';
  form.location = '';
  form.mainParams = {};
  form.verificationInterval = 1;
  form.notes = '';
  form.lastVerificationDate = '';
  form.productionDate = '';
  paramsList.value = [];
  error.value = '';
  isEdit.value = false;
  editId.value = null;
}

function open(editItem?: any) {
  resetForm();
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
    form.status = editItem.status;
    form.location = editItem.location || '';
    form.mainParams = editItem.mainParams || {};
    form.verificationInterval = Number(editItem.verificationInterval) || 1;
    form.notes = editItem.notes || '';
    form.lastVerificationDate = editItem.lastVerificationDate || '';
    form.productionDate = editItem.productionDate || '';
    paramsList.value = paramsFromJson(form.mainParams);
  }
  visible.value = true;
}

const hasChanges = computed(() => {
  return form.name || form.manufacturer || form.model || form.typeName ||
         form.serialNumber || form.inventoryNumber || form.tabNumber ||
         form.location || form.verificationInterval || form.notes ||
         form.productionDate || paramsList.value.length > 0
})

async function confirmClose() {
  // Если есть введённые данные, показываем подтверждение
  if (hasChanges.value) {
    const confirmed = await confirmDialog.value?.show(
      'Подтверждение закрытия',
      'Вы уверены что хотите закрыть окно?'
    )
    if (confirmed) {
      close()
    }
  } else {
    close()
  }
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
  const data: any = {
    name: form.name,
    manufacturer: form.manufacturer,
    model: form.model,
    typeName: form.typeName.trim(),
    serialNumber: form.serialNumber,
    inventoryNumber: form.inventoryNumber,
    tabNumber: form.tabNumber,
    status: form.status,
    location: form.location,
    mainParams: mainParams,
    verificationInterval: Number(form.verificationInterval),
    notes: form.notes,
    productionDate: form.productionDate,
    isDeleted: false,
  };
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

.required {
  color: var(--danger-color);
  margin-left: 2px;
}

.text-muted {
  font-size: var(--font-size-small);
  color: var(--text-muted);
  display: block;
  margin-top: 8px;
}

.params-container {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  background: #fafbfc;
  margin-top: 4px;
}

.param-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  align-items: center;
}

.param-name-input {
  flex: 2;
  padding: 8px 10px;
  border: 1px solid var(--border-input);
  border-radius: var(--border-radius-small);
  font-size: 13px;
}

.param-value-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border-input);
  border-radius: var(--border-radius-small);
  font-size: 13px;
}

.param-unit-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--border-input);
  border-radius: var(--border-radius-small);
  font-size: 13px;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--danger-color);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-small);
}

.btn-remove:hover {
  background-color: #ffebee;
  color: var(--danger-dark);
}

.btn-add-param {
  width: 100%;
  margin-top: 12px;
  padding: 6px 12px;
  background: none;
  border: 1px dashed var(--primary-color);
  color: var(--primary-color);
  border-radius: var(--border-radius-small);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn-add-param:hover {
  background: var(--primary-light);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--border-radius-small);
}

.modal-close:hover {
  background-color: var(--secondary-color);
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}
</style>