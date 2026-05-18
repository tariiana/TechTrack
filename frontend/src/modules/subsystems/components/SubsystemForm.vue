<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование' : 'Новая подсистема' }}</div>
      <form @submit.prevent="save">
        <div class="form-group"><label>Название *</label><input v-model="form.name" required /></div>
        <div class="form-group"><label>Расположение *</label><input v-model="form.location" required /></div>
        <div class="form-group"><label>Родительская подсистема</label>
          <select v-model="form.parent_id">
            <option :value="null">(нет)</option>
            <option v-for="s in subsystems" :key="s.subsys_id" :value="s.subsys_id">{{ s.name }}</option>
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
import { useSubsystemStore } from '../stores/subsystemsStore';

const store = useSubsystemStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const subsystems = ref<any[]>([]);
const error = ref('');
const form = reactive({
  name: '',
  location: '',
  parent_id: null as string | null,
  note: '',
});

async function loadSubsystems() {
  await store.fetchAll();
  subsystems.value = store.subsystems;
}

function open(subsys?: any) {
  loadSubsystems();
  if (subsys) {
    isEdit.value = true;
    editId.value = subsys.subsys_id;
    form.name = subsys.name;
    form.location = subsys.location;
    form.parent_id = subsys.parent_id || null;
    form.note = subsys.note || '';
  } else {
    reset();
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
}
function close() { visible.value = false; }
async function save() {
  try {
    const data = { ...form };
    if (isEdit.value && editId.value) {
      await store.update(editId.value, data);
    } else {
      await store.create(data);
    }
    close();
    window.dispatchEvent(new Event('subsystem-saved'));
  } catch (err: any) {
    error.value = err.message;
  }
}
defineExpose({ open });
</script>