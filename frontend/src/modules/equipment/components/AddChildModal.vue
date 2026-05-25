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
/* Локальных стилей нет – всё из глобального */
</style>