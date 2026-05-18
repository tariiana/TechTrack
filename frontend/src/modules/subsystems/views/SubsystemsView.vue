<template>
  <div class="card">
    <div class="header">
      <h2>Подсистемы</h2>
      <button class="btn btn-primary" @click="openForm">+ Добавить</button>
    </div>
    <div v-if="store.isLoading">Загрузка...</div>
    <SubsystemTree :nodes="store.tree" @edit="edit" @delete="deleteSubsystem" />
    <SubsystemForm ref="formRef" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import SubsystemTree from '../components/SubsystemTree.vue';
import SubsystemForm from '../components/SubsystemForm.vue';

const store = useSubsystemStore();
const formRef = ref();

async function refresh() {
  await store.fetchTree();
}
function openForm() { formRef.value?.open(); }
function edit(subsys: any) { formRef.value?.open(subsys); }
async function deleteSubsystem(id: string) {
  if (confirm('Удалить подсистему?')) await store.remove(id);
}
onMounted(() => store.fetchTree());
</script>