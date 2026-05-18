<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование ресурса' : 'Добавление ресурса' }}</div>
      <div class="form-group">
        <label>Наименование*</label>
        <input v-model="form.name" class="form-control" autofocus />
      </div>
      <div class="form-group">
        <label>Значение*</label>
        <input v-model="form.value" class="form-control" />
      </div>
      <div class="form-group">
        <label>Единица измерения</label>
        <input v-model="form.unit" class="form-control" />
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
const editId = ref<string | null>(null);
const nodeId = ref<string | null>(null);   // UUID как строка
const error = ref('');
const saving = ref(false);

const form = reactive({
  name: '',
  value: '',
  unit: '',
});

function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function open(nId: string, res?: any) {
  reset();
  nodeId.value = nId;
  if (res) {
    isEdit.value = true;
    editId.value = res.resource_id;
    form.name = res.name;
    form.value = res.value;
    form.unit = res.unit || '';
  }
  visible.value = true;
}

function reset() {
  form.name = '';
  form.value = '';
  form.unit = '';
  error.value = '';
  isEdit.value = false;
  editId.value = null;
}

function close() {
  visible.value = false;
  reset();
}

async function save() {
  if (!form.name || !form.value) {
    error.value = 'Заполните обязательные поля';
    return;
  }
  saving.value = true;
  error.value = '';

  // Формируем данные для бэкенда
  const resourceParams = {
    name: form.name,
    value: form.value,
    unit: form.unit,
  };
  const data = {
    node_id: nodeId.value!,
    registration_date: getCurrentDate(),
    resource_params: resourceParams,
    note: '',
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