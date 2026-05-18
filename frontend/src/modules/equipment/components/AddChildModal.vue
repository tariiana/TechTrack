<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">Добавление в состав</div>
      <div class="form-group">
        <label>Выберите узел</label>
        <select v-model="selectedChildId" class="form-control">
          <option :value="null">-- Выберите --</option>
          <option v-for="node in availableNodes" :key="node.node_id" :value="node.node_id">
            {{ node.name }} ({{ node.type === 'aggregate' ? 'Агрегат' : 'Блок' }})
          </option>
        </select>
      </div>
      <div v-if="error" class="error-text">{{ error }}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="add">Добавить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEquipmentStore } from '../stores/equipmentStore';

const store = useEquipmentStore();
const visible = ref(false);
const parentId = ref<string | null>(null);
const selectedChildId = ref<string | null>(null);
const error = ref('');

const availableNodes = computed(() => {
  if (!parentId.value) return [];
  // Все узлы, которые не списаны, не являются родителем и не уже в составе
  const existingChildIds = store.nodes
    .filter((n: any) => n.installed_in_node === parentId.value)
    .map((n: any) => n.node_id);
  return store.nodes.filter((n: any) => 
    !n.write_off_date && 
    n.node_id !== parentId.value && 
    !existingChildIds.includes(n.node_id)
  );
});

function open(pId: string) {
  parentId.value = pId;
  selectedChildId.value = null;
  error.value = '';
  visible.value = true;
}
function close() { visible.value = false; }
async function add() {
  if (!selectedChildId.value) {
    error.value = 'Выберите узел';
    return;
  }
  try {
    // Обновляем дочерний узел: устанавливаем installed_in_node = parentId
    await store.updateNode(selectedChildId.value, { installed_in_node: parentId.value });
    close();
    window.dispatchEvent(new Event('equipment-saved'));
  } catch (err: any) {
    error.value = err.message || 'Не удалось добавить узел';
  }
}
defineExpose({ open });
</script>