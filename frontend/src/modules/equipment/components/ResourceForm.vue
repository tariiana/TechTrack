<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>

      <div class="form-group">
        <label>Наименование*</label>
        <input v-model="form.name" class="form-control" :class="{ 'invalid': errors.name }" />
        <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
      </div>

      <div class="form-group">
        <label>Значение*</label>
        <input v-model="form.value" class="form-control" :class="{ 'invalid': errors.value }" />
        <span v-if="errors.value" class="error-text">{{ errors.value }}</span>
      </div>

      <div class="form-group">
        <label>Единица измерения</label>
        <input v-model="form.unit" class="form-control" />
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.note" rows="2" class="form-control"></textarea>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useResourcesStore } from '@/modules/resources/stores/resourcesStore';

const resourcesStore = useResourcesStore();

const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);  // изменено на string
const nodeId = ref<number | null>(null);
const error = ref('');
const saving = ref(false);

const errors = reactive({
  name: '',
  value: '',
});

const form = reactive({
  name: '',
  value: '',
  unit: '',
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
  errors.value = '';

  if (!form.name.trim()) {
    errors.name = 'Введите наименование';
    isValid = false;
  }
  if (!form.value.toString().trim()) {
    errors.value = 'Введите значение';
    isValid = false;
  }

  return isValid;
}

function open(nId: number, res?: any) {
  reset();
  nodeId.value = nId;
  if (res) {
    isEdit.value = true;
    editId.value = String(res.resource_id);  // преобразуем в строку
    form.name = res.name || '';
    form.value = res.value || '';
    form.unit = res.unit || '';
    form.note = res.note || '';
  }
  visible.value = true;
}

function reset() {
  form.name = '';
  form.value = '';
  form.unit = '';
  form.note = '';
  error.value = '';
  errors.name = '';
  errors.value = '';
  isEdit.value = false;
  editId.value = null;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!validate()) return;

  saving.value = true;
  error.value = '';

  const data = {
    node_id: nodeId.value!,
    name: form.name,
    value: form.value,
    unit: form.unit,
    registration_date: getCurrentDate(),
    note: form.note,
  };

  try {
    if (isEdit.value && editId.value) {
      await resourcesStore.updateResource(editId.value, data);
    } else {
      await resourcesStore.createResource(data);
    }
    window.dispatchEvent(new Event('resource-saved'));
    close();
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения ресурса';
  } finally {
    saving.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped>
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
</style>