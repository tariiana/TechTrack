<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 600px;">
      <div class="modal-header">{{ isEdit ? 'Редактирование узла' : 'Добавление узла' }}</div>
      <form @submit.prevent="save">
        <div class="form-group"><label>Наименование *</label><input v-model="form.name" required /></div>
        <div class="form-row">
          <div class="form-group"><label>Производитель</label><input v-model="form.manufacturer" /></div>
          <div class="form-group"><label>Модель</label><input v-model="form.model" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Зав. номер</label><input v-model="form.serial_number" /></div>
          <div class="form-group"><label>Инв. номер</label><input v-model="form.inventory_number" /></div>
        </div>
        <div class="form-group"><label>Местоположение *</label><input v-model="form.location" required /></div>
        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.status">
            <option value="получен">Получен</option>
            <option value="исправен">Исправен</option>
            <option value="неисправен">Неисправен</option>
            <option value="в ремонте">В ремонте</option>
            <option value="на поверке">На поверке</option>
            <option value="законсервирован">Законсервирован</option>
            <option value="списан">Списан</option>
          </select>
        </div>
        <div class="form-group"><label>Примечания</label><textarea v-model="form.note"></textarea></div>
        <div v-if="error" class="error-text">{{ error }}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
          <button type="submit" class="btn btn-primary">Сохранить</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useEquipmentStore } from '../stores/equipmentStore';

const store = useEquipmentStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');

const form = reactive({
  name: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  inventory_number: '',
  location: '',
  status: 'получен',
  note: '',
});

function open(node?: any) {
  reset();
  if (node) {
    isEdit.value = true;
    editId.value = node.node_id;
    Object.assign(form, node);
  }
  visible.value = true;
}

function reset() {
  form.name = '';
  form.manufacturer = '';
  form.model = '';
  form.serial_number = '';
  form.inventory_number = '';
  form.location = '';
  form.status = 'получен';
  form.note = '';
  error.value = '';
  isEdit.value = false;
  editId.value = null;
}

function close() {
  visible.value = false;
}

async function save() {
  try {
    if (isEdit.value && editId.value) {
      await store.updateNode(editId.value, form);
    } else {
      await store.createNode(form);
    }
    close();
    window.dispatchEvent(new Event('node-saved'));
  } catch (err: any) {
    error.value = err.message;
  }
}

defineExpose({ open });
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 15px;
}
.form-row .form-group {
  flex: 1;
}
</style>