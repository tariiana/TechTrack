<template>
  <div class="subsystems-view">
    <aside class="sidebar">
      <SubsystemTree
        :selected-id="selectedId"
        @select-subsystem="onSelectSubsystem"
      />
    </aside>

    <main class="main">
      <SubsystemCard
        v-if="selectedId"
        :id="selectedId"
        @deleted="clearSelection"
      />

      <section v-else class="card subsystem-empty-state">
        <h2>Подсистемы</h2>
        <p>Подсистема не выбрана.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SubsystemTree from '../components/SubsystemTree.vue';
import SubsystemCard from '../components/SubsystemCard.vue';

const route = useRoute();
const router = useRouter();
const selectedId = ref<string | null>(typeof route.params.id === 'string' ? route.params.id : null);

function onSelectSubsystem(id: string) {
  if (id !== selectedId.value) {
    router.push(`/subsystems/${id}`);
  }
}

function clearSelection() {
  router.push('/subsystems');
}

watch(
  () => route.params.id,
  (id) => {
    selectedId.value = typeof id === 'string' ? id : null;
  }
);
</script>

<style scoped>
.subsystem-empty-state {
  min-height: 220px;
  justify-content: center;
  gap: 10px;
}

.subsystem-empty-state h2 {
  color: #263746;
  font-size: 22px;
}

.subsystem-empty-state p {
  max-width: 560px;
  color: #5b6773;
  line-height: 1.6;
}
</style>
