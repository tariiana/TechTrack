<template>
  <div class="tree-node">
    <div class="tree-node-header" @click="toggle">
      <span class="toggle" v-if="hasChildren">{{ expanded ? '▼' : '▶' }}</span>
      <span class="label" @click.stop="$emit('select', node.id)">{{ node.name }}</span>
    </div>
    <div class="children" v-if="expanded && hasChildren">
      <TreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ node: any }>();
const emit = defineEmits(['select']);
const expanded = ref(false);
const hasChildren = props.node.children && props.node.children.length > 0;
const toggle = () => { if (hasChildren) expanded.value = !expanded.value; };
</script>

<style scoped>
.tree-node-header {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px;
}
.toggle {
  width: 20px;
  display: inline-block;
}
.label {
  flex: 1;
}
.children {
  margin-left: 20px;
}
</style>