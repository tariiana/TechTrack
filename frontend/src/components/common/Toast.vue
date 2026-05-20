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
  border-radius: 8px;
  color: white;
  z-index: 9999;
  animation: slideIn 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  text-align: center;
}

.toast.success {
  background-color: #27ae60;
}

.toast.error {
  background-color: #c0392b;
}

.toast.info {
  background-color: #2c5f8a;
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