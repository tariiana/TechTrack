<template>
  <div class="subsystems-view">
    <div class="sidebar">
      <SubsystemTree @select-subsystem="onSelectSubsystem" />
    </div>
    <div class="main">
      <SubsystemCard v-if="selectedId" :id="selectedId" />
      <div v-else class="card empty-state">Выберите подсистему</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SubsystemTree from '../components/SubsystemTree.vue';
import SubsystemCard from '../components/SubsystemCard.vue';

const selectedId = ref<string | null>(null);
function onSelectSubsystem(id: string) {
  selectedId.value = id;
}
</script>