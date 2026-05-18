<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ dialogTitle }}</div>
      <div>{{ dialogMessage }}</div>
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
