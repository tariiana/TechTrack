<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>

      <div class="form-group">
        <label>Дата регистрации</label>
        <input type="date" v-model="form.registration_date" class="form-control" />
      </div>

      <div class="form-group">
        <label>Параметры ресурса (JSON)</label>
        <textarea v-model="paramsStr" rows="6" class="form-control" placeholder='{"capacity": 7.2, "voltage": 12.8}'></textarea>
        <div v-if="jsonError" class="error-text">{{ jsonError }}</div>
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.note" rows="2" class="form-control"></textarea>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" :disabled="loading" @click="save">{{ loading ? 'Сохранение...' : 'Сохранить' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useEquipmentStore } from '../stores/equipmentStore';

const store = useEquipmentStore();

const visible = ref(false);
const isEdit = ref(false);
const loading = ref(false);
const error = ref('');
const jsonError = ref('');

const form = reactive({
  node_id: '',
  registration_date: '',
  resource_params: {} as any,
  note: '',
});

const paramsStr = ref('{}');

// При открытии
function open(nodeId: string, existingResource?: any) {
  reset();
  form.node_id = nodeId;
  if (existingResource) {
    isEdit.value = true;
    form.registration_date = existingResource.registration_date || '';
    form.resource_params = existingResource.resource_params || {};
    form.note = existingResource.note || '';
    paramsStr.value = JSON.stringify(form.resource_params, null, 2);
  } else {
    isEdit.value = false;
    // Сегодняшняя дата по умолчанию
    const today = new Date().toISOString().slice(0, 10);
    form.registration_date = today;
  }
  visible.value = true;
}

function reset() {
  form.node_id = '';
  form.registration_date = '';
  form.resource_params = {};
  form.note = '';
  paramsStr.value = '{}';
  jsonError.value = '';
  error.value = '';
}

function close() {
  visible.value = false;
  reset();
}

function validate(): boolean {
  if (!form.registration_date) {
    error.value = 'Укажите дату регистрации';
    return false;
  }
  try {
    const parsed = JSON.parse(paramsStr.value);
    form.resource_params = parsed;
    jsonError.value = '';
  } catch {
    jsonError.value = 'Неверный формат JSON';
    return false;
  }
  error.value = '';
  return true;
}

async function save() {
  if (!validate()) return;
  loading.value = true;
  try {
    if (isEdit.value) {
      await store.updateResource(form.node_id, form.resource_params, form.note);
    } else {
      await store.addResource({
        node_id: form.node_id,
        registration_date: form.registration_date,
        resource_params: form.resource_params,
        note: form.note,
      });
    }
    window.dispatchEvent(new Event('resource-saved'));
    close();
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения ресурса';
  } finally {
    loading.value = false;
  }
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
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
}
.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e4e8;
  font-weight: bold;
}
.form-group {
  padding: 12px 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}
.form-control {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e4e8;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-secondary {
  background: #e0e4e8;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary {
  background: #1976d2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.error-text {
  color: #d32f2f;
  font-size: 12px;
  margin-top: 4px;
  padding: 0 16px;
}
</style>