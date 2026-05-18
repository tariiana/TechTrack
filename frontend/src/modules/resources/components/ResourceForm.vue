<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование' : 'Новый ресурс' }}</div>
      <form @submit.prevent="save">
        <div class="form-group"><label>Узел *</label>
          <select v-model="form.node_id" required>
            <option v-for="n in nodes" :key="n.node_id" :value="n.node_id">{{ n.name }}</option>
          </select>
        </div>
        <div class="form-group"><label>Дата регистрации *</label><input type="date" v-model="form.registration_date" required /></div>
        <div class="form-group"><label>Параметры (JSON) *</label><textarea v-model="paramsStr" rows="5" required></textarea></div>
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
import { ref, reactive, onMounted } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';

const store = useResourcesStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const nodes = ref<any[]>([]);
const form = reactive({
  node_id: '',
  registration_date: new Date().toISOString().split('T')[0],
  note: '',
});
const paramsStr = ref('{}');

async function loadNodes() {
  const eqStore = useEquipmentStore();
  await eqStore.fetchNodes();
  nodes.value = eqStore.nodes;
}

function open(res?: any) {
  loadNodes();
  if (res) {
    isEdit.value = true;
    editId.value = res.resource_id;
    form.node_id = res.node_id;
    form.registration_date = res.registration_date;
    form.note = res.note || '';
    paramsStr.value = JSON.stringify(res.resource_params || {}, null, 2);
  } else {
    reset();
  }
  visible.value = true;
}
function reset() {
  isEdit.value = false;
  editId.value = null;
  form.node_id = '';
  form.registration_date = new Date().toISOString().split('T')[0];
  form.note = '';
  paramsStr.value = '{}';
  error.value = '';
}
function close() { visible.value = false; }
async function save() {
  try {
    const resourceParams = JSON.parse(paramsStr.value);
    const data = {
      node_id: form.node_id,
      registration_date: form.registration_date,
      resource_params: resourceParams,
      note: form.note,
    };
    if (isEdit.value && editId.value) {
      await store.updateResource(editId.value, data);
    } else {
      await store.createResource(data);
    }
    close();
    window.dispatchEvent(new Event('resource-saved'));
  } catch (e: any) {
    error.value = e.message;
  }
}
defineExpose({ open });
</script>