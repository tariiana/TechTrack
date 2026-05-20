<template>
  <div id="app">
    <router-view />
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import Toast from '@/components/common/Toast.vue'
import { registerToast } from '@/utils/toast'
import { onMounted, ref } from 'vue'

const toastRef = ref()

onMounted(() => {
  // Регистрируем Toast глобально
  if (toastRef.value) {
    registerToast((message: string, type: 'success' | 'error' | 'info') => {
      toastRef.value?.show(message, type)
    })
  }
})
</script>

<style>
#app {
  width: 100%;
  height: 100%;
}
</style>