<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
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

// Доступные для добавления узлы
const availableNodes = computed(() => {
  if (!parentId.value) return [];
  // ID уже установленных в этого родителя
  const existingChildIds = store.allNodes
    .filter((n: any) => n.installed_in_node === parentId.value && n.status !== 'списан')
    .map((n: any) => n.node_id);
  // Доступны: не списанные, не сам родитель, не уже установленные
  return store.allNodes.filter((n: any) =>
    n.status !== 'списан' &&
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

function close() {
  visible.value = false;
}

async function add() {
  if (!selectedChildId.value) {
    error.value = 'Выберите узел';
    return;
  }
  try {
    await store.addChild(parentId.value!, selectedChildId.value);
    close();
    window.dispatchEvent(new Event('equipment-saved'));
  } catch (err: any) {
    error.value = err.message || 'Не удалось добавить узел (проверьте циклы или совместимость)';
  }
}

defineExpose({ open });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}
.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e4e8;
  font-weight: bold;
}
.form-group {
  padding: 16px;
}
.form-control {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e4e8;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-secondary {
  background: #e0e4e8;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary {
  background: #1976d2;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.error-text {
  color: #d32f2f;
  font-size: 12px;
  padding: 0 16px 8px;
}
</style>