<template>
  <div class="card">
    <h3>Дерево оборудования</h3>
    <div class="tree">
      <TreeNode
        v-for="node in store.tree"
        :key="node.id"
        :node="node"
        @select="onSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import TreeNode from './TreeNode.vue';

const router = useRouter();
const store = useEquipmentStore();

function onSelect(id: number) {
  router.push(`/equipment/${id}`);
}
</script>

<style scoped>
.tree {
  margin-top: 10px;
}
</style>