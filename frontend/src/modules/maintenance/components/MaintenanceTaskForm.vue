<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование задачи' : 'Новая задача' }}</div>
      <form @submit.prevent="save">
        <div class="form-group"><label>Узел *</label>
          <select v-model="form.node_id" required>
            <option v-for="n in nodes" :key="n.node_id" :value="n.node_id">{{ n.name }}</option>
          </select>
        </div>
        <div class="form-group"><label>Тип ТО *</label>
          <select v-model="form.type_id" required>
            <option value="1">Плановое ТО</option>
            <option value="2">Внеплановое ТО</option>
            <option value="3">Капитальный ремонт</option>
            <option value="4">Аварийный ремонт</option>
          </select>
        </div>
        <div class="form-group"><label>Статус</label>
          <select v-model="form.status_id">
            <option value="1">Ожидает</option>
            <option value="2">В работе</option>
            <option value="3">Выполнено</option>
          </select>
        </div>
        <div class="form-group"><label>Примечания</label><textarea v-model="form.notes"></textarea></div>
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
import { ref, reactive, onMounted } from 'vue';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';

const store = useMaintenanceStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const nodes = ref<any[]>([]);
const form = reactive({
  node_id: '',
  type_id: 1,
  status_id: 1,
  notes: '',
});

async function loadNodes() {
  const eqStore = useEquipmentStore();
  await eqStore.fetchNodes();
  nodes.value = eqStore.nodes;
}

function open(task?: any) {
  loadNodes();
  if (task) {
    isEdit.value = true;
    editId.value = task.maintenance_id;
    form.node_id = task.node_id;
    form.type_id = task.type_id;
    form.status_id = task.status_id;
    form.notes = task.notes || '';
  } else {
    reset();
  }
  visible.value = true;
}
function reset() {
  isEdit.value = false;
  editId.value = null;
  form.node_id = '';
  form.type_id = 1;
  form.status_id = 1;
  form.notes = '';
}
function close() { visible.value = false; }
async function save() {
  try {
    if (isEdit.value && editId.value) {
      await store.updateTask(editId.value, form);
    } else {
      await store.createTask(form);
    }
    close();
    window.dispatchEvent(new Event('task-saved'));
  } catch (err: any) {
    error.value = err.message;
  }
}
defineExpose({ open });
</script>