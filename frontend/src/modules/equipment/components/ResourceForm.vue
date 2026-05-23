<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>

      <div class="form-group">
        <label>Наименование *</label>
        <input v-model="form.name" class="form-control" />
        <div v-if="errors.name" class="error-text">{{ errors.name }}</div>
      </div>

      <div class="form-group">
        <label>Значение *</label>
        <input v-model="form.value" class="form-control" />
        <div v-if="errors.value" class="error-text">{{ errors.value }}</div>
      </div>

      <div class="form-group">
        <label>Единица измерения</label>
        <input v-model="form.unit" class="form-control" placeholder="например, %, В, А·ч" />
      </div>

      <div class="form-group">
        <label>Дата регистрации</label>
        <input type="date" v-model="form.registration_date" class="form-control" />
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.note" rows="2" class="form-control"></textarea>
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
import { useEquipmentStore } from '../stores/equipmentStore';

const store = useEquipmentStore();

const visible = ref(false);
const isEdit = ref(false);
const saving = ref(false);
const error = ref('');
const errors = reactive({ name: '', value: '' });

const form = reactive({
  name: '',
  value: '',
  unit: '',
  registration_date: '',
  note: '',
  node_id: null as string | null,
});

function resetForm() {
  form.name = '';
  form.value = '';
  form.unit = '';
  form.registration_date = new Date().toISOString().slice(0, 10);
  form.note = '';
  form.node_id = null;
  errors.name = '';
  errors.value = '';
  error.value = '';
  isEdit.value = false;
}

function open(nodeId: string, existingResource?: any) {
  resetForm();
  form.node_id = nodeId;
  if (existingResource) {
    isEdit.value = true;
    form.name = existingResource.name || existingResource.resource_params?.name || '';
    form.value = existingResource.value || existingResource.resource_params?.value || '';
    form.unit = existingResource.unit || existingResource.resource_params?.unit || '';
    form.registration_date = existingResource.registration_date || '';
    form.note = existingResource.note || '';
  }
  visible.value = true;
}

function close() {
  visible.value = false;
}

function validate(): boolean {
  let isValid = true;
  if (!form.name.trim()) {
    errors.name = 'Введите наименование';
    isValid = false;
  } else {
    errors.name = '';
  }
  if (!form.value.trim()) {
    errors.value = 'Введите значение';
    isValid = false;
  } else {
    errors.value = '';
  }
  return isValid;
}

async function save() {
  if (!validate()) return;
  saving.value = true;
  error.value = '';

  const data = {
    node_id: form.node_id!,
    name: form.name,
    value: form.value,
    unit: form.unit,
    registration_date: form.registration_date || new Date().toISOString().slice(0, 10),
    note: form.note,
    resource_params: {
      name: form.name,
      value: form.value,
      unit: form.unit,
    },
  };

  try {
    if (isEdit.value) {
      await store.updateResource(form.node_id!, data.resource_params, data.note);
    } else {
      await store.addResource(data);
    }
    window.dispatchEvent(new Event('resource-saved'));
    close();
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped>

.modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
.modal-content { background:white; border-radius:8px; width:500px; max-width:90%; }
.modal-header { padding:12px 16px; border-bottom:1px solid #e2e8f0; font-weight:600; }
.modal-footer { padding:10px 16px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:8px; }
.form-group { margin-bottom:12px; padding:0 16px; }
.form-group label { display:block; margin-bottom:4px; font-weight:500; }
.form-control { width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:4px; }
.error-text { color:#c0392b; font-size:12px; margin-top:4px; }
.btn-primary { background: #2c5f8a;; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; }
.btn-secondary { background:#e0e4e8; border:1px solid #cbd5e1; padding:6px 12px; border-radius:4px; cursor:pointer; }
</style>