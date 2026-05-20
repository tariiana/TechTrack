<template>
  <div class="tree-node">
    <div class="tree-node-header" @click="toggle" :class="{ 'has-children': hasChildren }">
      <span class="tree-toggle" v-if="hasChildren">{{ expanded ? '▼' : '▶' }}</span>
      <span class="tree-toggle-placeholder" v-else></span>
      <span class="tree-icon">📁</span>
      <span class="tree-node-label" @click.stop="selectItem">{{ node.name }}</span>
    </div>
    <div v-if="hasChildren && expanded" class="tree-node-children">
      <SubsystemTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @select-subsystem="$emit('select-subsystem', $event)"
        @select-content="$emit('select-content', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{ node: any }>();
const emit = defineEmits(['select-subsystem', 'select-content']);

const expanded = ref(false);
const hasChildren = computed(() => props.node.children && props.node.children.length > 0);

function toggle() {
  if (hasChildren.value) expanded.value = !expanded.value;
}
function selectItem() {
  if (props.node.type === 'subsystem') {
    emit('select-subsystem', props.node.id);
  }
}
</script>