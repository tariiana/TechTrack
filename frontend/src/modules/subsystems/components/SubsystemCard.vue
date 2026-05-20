<template>
  <div class="card" v-if="subsystem">
    <h2>{{ subsystem.name }}</h2>
    <div class="info-grid">
      <div class="info-row"><div class="info-label">ID</div><div class="info-value">{{ subsystem.subsys_id }}</div></div>
      <div class="info-row"><div class="info-label">Наименование</div><div class="info-value">{{ subsystem.name }}</div></div>
      <div class="info-row"><div class="info-label">Расположение</div><div class="info-value">{{ subsystem.location || '-' }}</div></div>
      <div class="info-row"><div class="info-label">Родитель</div><div class="info-value">{{ parentName }}</div></div>
      <div class="info-row"><div class="info-label">Примечание</div><div class="info-value">{{ subsystem.note || '-' }}</div></div>
    </div>
    <button class="btn btn-secondary" @click="goBack">Назад</button>
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSubsystemStore } from '../stores/subsystemsStore';

const props = defineProps<{ id?: string }>();
const route = useRoute();
const router = useRouter();
const store = useSubsystemStore();
const subsystem = ref<any>(null);

const parentName = computed(() => {
  if (!subsystem.value?.parent_id) return '-';
  const parent = store.subsystems.find((s: any) => s.subsys_id === subsystem.value.parent_id);
  return parent ? parent.name : '-';
});

async function loadData() {
  const id = props.id || (route.params.id as string);
  if (!id) return;
  await store.fetchAll();
  subsystem.value = store.subsystems.find((s: any) => s.subsys_id === id);
}

function goBack() { router.back(); }

onMounted(() => loadData());
</script>