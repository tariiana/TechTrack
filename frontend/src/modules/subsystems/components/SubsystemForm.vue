<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ isEdit ? 'Редактирование подсистемы' : 'Добавление подсистемы' }}</div>
      <div class="form-group">
        <label>Наименование*</label>
        <input type="text" v-model="form.name" class="form-control" :class="{ 'invalid': errors.name }" />
        <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
      </div>
      <div class="form-group">
        <label>Расположение*</label>
        <input type="text" v-model="form.location" class="form-control" :class="{ 'invalid': errors.location }" />
        <span v-if="errors.location" class="error-text">{{ errors.location }}</span>
      </div>
      <div class="form-group">
        <label>Родительская подсистема</label>
        <select v-model="form.parent_id" class="form-control">
          <option :value="null">-- Корневая (без родителя) --</option>
          <option v-for="sub in subsystems" :key="sub.subsys_id" :value="sub.subsys_id">
            {{ sub.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Примечания</label>
        <textarea v-model="form.note" rows="3" class="form-control"></textarea>
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
import { ref, reactive } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';

const store = useSubsystemStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const subsystems = ref<any[]>([]);

const errors = reactive({
  name: '',
  location: '',
});

const form = reactive({
  name: '',
  location: '',
  parent_id: null as string | null,
  note: '',
});

async function loadSubsystems() {
  await store.fetchAll();
  subsystems.value = Array.isArray(store.subsystems) 
  ? store.subsystems.filter(s => s.subsys_id !== editId.value)
  : [];
}

function validate(): boolean {
  let isValid = true;
  errors.name = '';
  errors.location = '';
  if (!form.name.trim()) { errors.name = 'Введите наименование'; isValid = false; }
  if (!form.location.trim()) { errors.location = 'Введите расположение'; isValid = false; }
  return isValid;
}

function open(subsys?: any) {
  reset();
  loadSubsystems();
  if (subsys) {
    isEdit.value = true;
    editId.value = subsys.subsys_id;
    form.name = subsys.name;
    form.location = subsys.location;
    form.parent_id = subsys.parent_id || null;
    form.note = subsys.note || '';
  }
  visible.value = true;
}

function reset() {
  isEdit.value = false;
  editId.value = null;
  form.name = '';
  form.location = '';
  form.parent_id = null;
  form.note = '';
  error.value = '';
  errors.name = '';
  errors.location = '';
}

function close() { visible.value = false; }

async function save() {
  if (!validate()) return;
  const data = { name: form.name, location: form.location, parent_id: form.parent_id, note: form.note };
  try {
    if (isEdit.value && editId.value) {
      await store.update(editId.value, data);
    } else {
      await store.create(data);
    }
    close();
    window.dispatchEvent(new Event('subsystem-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения подсистемы';
  }
}

defineExpose({ open });
</script>