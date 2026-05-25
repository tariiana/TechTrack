<template>
  <section class="subsystem-tree">
    <header class="tree-header">
      <h3>Подсистемы</h3>
      <button v-if="canEdit" class="btn btn-sm btn-primary" type="button" @click="openAddForm">
        Добавить
      </button>
    </header>

    <div v-if="store.error" class="tree-error">{{ store.error }}</div>

    <div v-if="store.isLoading" class="loading">Загрузка...</div>

    <div v-else class="tree-content">
      <SubsystemTreeNode
        v-for="node in store.tree"
        :key="node.id"
        :node="node"
        :selected-id="selectedId"
        @select-subsystem="onSelectSubsystem"
      />
      <div v-if="store.tree.length === 0" class="empty-tree">Нет подсистем</div>
    </div>

    <SubsystemForm ref="formRef" @saved="refresh" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import SubsystemTreeNode from './SubsystemTreeNode.vue';
import SubsystemForm from './SubsystemForm.vue';

defineProps<{ selectedId?: string | null }>();

const store = useSubsystemStore();
const formRef = ref<InstanceType<typeof SubsystemForm> | null>(null);
const emit = defineEmits<{ (event: 'select-subsystem', id: string): void }>();

// Проверка прав доступа
const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

function onSelectSubsystem(id: string) {
  emit('select-subsystem', id);
}

function openAddForm() {
  if (!canEdit.value) return;
  formRef.value?.open();
}

async function refresh() {
  await store.fetchTree();
}

onMounted(refresh);
</script>

<style scoped>
.subsystem-tree {
  width: 100%;
  min-height: 420px;
  max-height: calc(100vh - 116px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #d9e0e7;
  border-radius: 8px;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e3e8ee;
  background: #f7f9fb;
}

.tree-header h3 {
  font-size: 16px;
  color: #263746;
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

.loading,
.empty-tree,
.tree-error {
  padding: 14px 16px;
  color: #5b6773;
}

.tree-error {
  color: #9f2f24;
  background: #fff2f0;
  border-bottom: 1px solid #ffd4cf;
}
</style>