<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ dialogTitle }}</div>
      <div class="modal-message">{{ dialogMessage }}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleCancel">Нет</button>
        <button class="btn btn-primary" @click="handleConfirm">Да</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
let resolvePromise: ((value: boolean) => void) | null = null
const dialogTitle = ref('Подтверждение')
const dialogMessage = ref('')

const show = (title: string, message: string): Promise<boolean> => {
  dialogTitle.value = title
  dialogMessage.value = message
  visible.value = true
  return new Promise((resolve) => {
    resolvePromise = resolve
  })
}

const handleConfirm = () => {
  visible.value = false
  if (resolvePromise) resolvePromise(true)
  resolvePromise = null
}

const handleCancel = () => {
  visible.value = false
  if (resolvePromise) resolvePromise(false)
  resolvePromise = null
}

defineExpose({ show })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-modal);
  border-radius: var(--border-radius);
  width: 400px;
  max-width: 90%;
  padding: 20px;
  box-shadow: var(--shadow-modal);
}

.modal-header {
  font-size: var(--font-size-large);
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--text-secondary);
}

.modal-message {
  font-size: var(--font-size-base);
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>