<template>
  <div class="subsystem-tree">
    <div class="tree-header">
      <h3>Подсистемы</h3>
      <button class="btn btn-sm btn-primary" @click="openAddForm">+ Добавить</button>
    </div>
    <div class="tree-content" v-if="!store.isLoading">
      <SubsystemTreeNode
        v-for="node in store.tree"
        :key="node.id"
        :node="node"
        @select-subsystem="onSelectSubsystem"
        @select-content="onSelectContent"
      />
      <div v-if="store.tree.length === 0" class="empty-tree">Нет подсистем</div>
    </div>
    <div v-else class="loading">Загрузка...</div>
    <SubsystemForm ref="formRef" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import SubsystemTreeNode from './SubsystemTreeNode.vue';
import SubsystemForm from './SubsystemForm.vue';

const store = useSubsystemStore();
const formRef = ref();
const emit = defineEmits(['select-subsystem', 'select-content']);

function onSelectSubsystem(id: string) {
  emit('select-subsystem', id);
}
function onSelectContent(content: any) {
  emit('select-content', content);
}
function openAddForm() {
  formRef.value?.open();
}
function refresh() {
  store.fetchTree();
}
onMounted(() => {
  store.fetchTree();
});
</script>