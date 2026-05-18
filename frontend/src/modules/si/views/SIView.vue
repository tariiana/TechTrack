<template>
  <div>
    <div v-if="nodeId" class="back-button">
      <button class="btn btn-secondary" @click="goBackToEquipment">← Назад к узлу</button>
    </div>
    <SIList />
  </div>
</template>

<script setup lang="ts">
import SIList from '../components/SIList.vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const nodeId = route.query.nodeId ? Number(route.query.nodeId) : null;

function goBackToEquipment() {
  if (nodeId) {
    router.push(`/equipment/${nodeId}`);
  } else {
    router.back();
  }
}
</script>

<style scoped>
.back-button {
  margin-bottom: 15px;
}
</style>