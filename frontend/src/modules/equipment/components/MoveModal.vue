<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">Перемещение узла</div>
      <div class="form-group">
        <label>Новое местоположение</label>
        <input v-model="newLocation" class="form-control" placeholder="Введите новое место" />
      </div>
      <div v-if="error" class="error-text">{{ error }}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="move">Переместить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useEquipmentStore } from '../stores/equipmentStore';

const store = useEquipmentStore();
const visible = ref(false);
const node = ref<any>(null);
const newLocation = ref('');
const error = ref('');
const emit = defineEmits(['moved']);

function open(nodeData: any) {
  node.value = nodeData;
  newLocation.value = nodeData.location || '';
  error.value = '';
  visible.value = true;
}
function close() { visible.value = false; }
async function move() {
  if (!newLocation.value.trim()) {
    error.value = 'Введите новое местоположение';
    return;
  }
  try {
    // Обновляем местоположение узла через API (история перемещений создаётся на бэкенде автоматически)
    await store.updateNode(node.value.node_id, { location: newLocation.value });
    close();
    emit('moved');
  } catch (err: any) {
    error.value = err.message || 'Ошибка при перемещении';
  }
}
defineExpose({ open });
</script>