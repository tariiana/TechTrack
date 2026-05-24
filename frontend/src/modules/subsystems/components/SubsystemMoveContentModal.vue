<template>
  <div v-if="visible" class="modal-overlay">
    <form class="modal-content move-modal" @submit.prevent="save">
      <div class="modal-header">Перемещение</div>

      <div class="form-group">
        <label>Объект</label>
        <div class="readonly-field">{{ item?.title || item?.name || 'Без названия' }}</div>
      </div>

      <div class="form-group">
        <label for="target-subsystem">Целевая подсистема</label>
        <select id="target-subsystem" v-model="targetSubsystemId" class="form-control">
          <option value="" disabled>Выберите подсистему</option>
          <option
            v-for="subsystem in options"
            :key="subsystem.subsys_id"
            :value="subsystem.subsys_id"
          >
            {{ subsystem.name }}
          </option>
        </select>
      </div>

      <div v-if="error" class="error-text form-error">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" @click="close">Отмена</button>
        <button class="btn btn-primary" type="submit" :disabled="!targetSubsystemId || isSaving">
          {{ isSaving ? 'Перемещение...' : 'Переместить' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import type { SubsystemContentItem } from '../types/subsystemsTypes';

const store = useSubsystemStore();
const visible = ref(false);
const currentSubsystemId = ref('');
const targetSubsystemId = ref('');
const item = ref<SubsystemContentItem | null>(null);
const error = ref('');
const isSaving = ref(false);

const emit = defineEmits<{ (event: 'saved'): void }>();

const options = computed(() => (
  store.subsystems.filter((subsystem) => subsystem.subsys_id !== currentSubsystemId.value)
));

async function open(selectedItem: SubsystemContentItem, subsystemId: string) {
  item.value = selectedItem;
  currentSubsystemId.value = subsystemId;
  targetSubsystemId.value = '';
  error.value = '';
  await store.fetchAll();
  visible.value = true;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!item.value || !targetSubsystemId.value) return;

  try {
    isSaving.value = true;
    await store.moveContent(item.value.type, item.value.id, targetSubsystemId.value);
    close();
    emit('saved');
  } catch (err: any) {
    error.value = err.message || 'Не удалось переместить объект';
  } finally {
    isSaving.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped>
.move-modal {
  width: 480px;
}

.readonly-field {
  min-height: 38px;
  display: flex;
  align-items: center;
  border: 1px solid #dfe5eb;
  border-radius: 4px;
  padding: 8px 12px;
  background: #f7f9fb;
  color: #263746;
}

.form-error {
  margin-top: 10px;
}
</style>
