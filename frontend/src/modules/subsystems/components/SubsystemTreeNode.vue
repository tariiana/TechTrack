<template>
  <div class="tree-node">
    <button
      class="tree-node-header"
      :class="{ active: node.id === selectedId }"
      type="button"
      :aria-expanded="hasChildren ? expanded : undefined"
      @click="selectItem"
    >
      <span
        v-if="hasChildren"
        class="tree-toggle"
        aria-hidden="true"
        @click.stop="toggle"
      >
        {{ expanded ? '▾' : '▸' }}
      </span>
      <span v-else class="tree-toggle-placeholder"></span>
      <span class="tree-node-label">{{ node.name }}</span>
    </button>

    <div v-if="hasChildren && expanded" class="tree-node-children">
      <SubsystemTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        @select-subsystem="$emit('select-subsystem', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SubsystemTreeNode } from '../types/subsystemsTypes';

const props = defineProps<{
  node: SubsystemTreeNode;
  selectedId?: string | null;
}>();

const emit = defineEmits<{ (event: 'select-subsystem', id: string): void }>();

const expanded = ref(true);
const hasChildren = computed(() => props.node.children.length > 0);

function toggle() {
  if (hasChildren.value) expanded.value = !expanded.value;
}

function selectItem() {
  emit('select-subsystem', props.node.id);
}
</script>

<style scoped>
.tree-node {
  min-width: 0;
}

.tree-node-header {
  width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 6px;
  padding: 6px 8px;
  background: transparent;
  color: #263746;
  cursor: pointer;
  text-align: left;
}

.tree-node-header:hover {
  background: #eef3f7;
}

.tree-node-header.active {
  background: #dfeaf2;
  color: #173b57;
  font-weight: 600;
}

.tree-toggle,
.tree-toggle-placeholder {
  width: 18px;
  flex: 0 0 18px;
  color: #6c7884;
}

.tree-node-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-children {
  margin-left: 18px;
  padding-left: 8px;
  border-left: 1px solid #e0e5eb;
}
</style>
