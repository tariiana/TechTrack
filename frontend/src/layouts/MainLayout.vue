<template>
  <div class="app-layout">
    <AppHeader />
    <main class="app-main">
      <div class="app-container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/common/AppHeader.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
}

.app-container {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>