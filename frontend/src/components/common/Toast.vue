<template>
  <div v-if="visible" class="toast" :class="type">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref<'success' | 'error' | 'info'>('info')
let timeout: ReturnType<typeof setTimeout> | null = null

const show = (msg: string, toastType: 'success' | 'error' | 'info' = 'info') => {
  if (timeout) clearTimeout(timeout)
  message.value = msg
  type.value = toastType
  visible.value = true
  timeout = setTimeout(() => {
    visible.value = false
  }, 3000)
}

defineExpose({ show })
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 14px 24px;
  border-radius: var(--border-radius);
  color: var(--text-white);
  z-index: 9999;
  animation: slideIn 0.3s ease;
  font-size: var(--font-size-base);
  font-weight: 500;
  box-shadow: var(--shadow-modal);
  min-width: 200px;
  text-align: center;
}

.toast.success {
  background-color: var(--success-color);
}

.toast.error {
  background-color: var(--danger-color);
}

.toast.info {
  background-color: var(--primary-color);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>