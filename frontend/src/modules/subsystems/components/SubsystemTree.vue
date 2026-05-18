<template>
  <div class="tree">
    <div v-for="node in nodes" :key="node.id" class="tree-node">
      <div class="node-header">
        <span class="toggle" @click="toggle(node)" v-if="node.children?.length">
          {{ expanded[node.id] ? '▼' : '▶' }}
        </span>
        <span class="name">{{ node.name }}</span>
        <button class="btn-sm btn-secondary" @click="emit('edit', node)">✏️</button>
        <button class="btn-sm btn-danger" @click="emit('delete', node.id)">🗑️</button>
      </div>
      <div v-if="expanded[node.id]" class="children">
        <SubsystemTree :nodes="node.children" @edit="emit('edit', $event)" @delete="emit('delete', $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ nodes: any[] }>();
const emit = defineEmits(['edit', 'delete']);
const expanded = ref<Record<string, boolean>>({});

function toggle(node: any) {
  expanded.value[node.id] = !expanded.value[node.id];
}
</script>

<style scoped>
.tree-node { margin-left: 16px; }
.node-header { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
.toggle { cursor: pointer; width: 20px; }
.name { flex: 1; }
.children { margin-left: 24px; }
</style>