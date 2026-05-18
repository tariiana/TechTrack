<template>
  <div class="tree-node">
    <div
      class="tree-node-header"
      @click="toggle"
      :class="{
        'has-children': hasChildren,
        'is-module': node.type === 'module',
        'is-content': node.type === 'content',
      }"
    >
      <span class="tree-toggle" v-if="hasChildren">
        {{ expanded ? '▼' : '▶' }}
      </span>
      <span class="tree-toggle-placeholder" v-else></span>

      <span class="tree-icon">
        <span v-if="node.type === 'subsystem'">📁</span>
        <span v-else-if="node.type === 'module'">{{ node.icon }}</span>
        <span v-else-if="node.type === 'content'">
          <span v-if="node.contentType === 'si'">📏</span>
          <span v-else-if="node.contentType === 'equipment'">🖥️</span>
          <span v-else-if="node.contentType === 'resource'">⚡</span>
          <span v-else-if="node.contentType === 'maintenance'">🔧</span>
        </span>
      </span>

      <span class="tree-node-label" @click.stop="selectItem">
        {{ node.name }}
      </span>

      <span class="tree-node-badge" v-if="node.type === 'module' && contentCount > 0">
        {{ contentCount }}
      </span>

      <span class="tree-node-status" v-if="node.type === 'content' && node.status">
        <span :class="getStatusClass(node.status)">{{ getStatusText(node.status) }}</span>
      </span>
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
import { ref, computed } from 'vue'

const props = defineProps<{ node: any }>()
const emit = defineEmits(['select-subsystem', 'select-content'])

const expanded = ref(false)
const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
const contentCount = computed(() => {
  if (props.node.type !== 'module') return 0
  return props.node.children?.length || 0
})

function toggle() {
  if (hasChildren.value) expanded.value = !expanded.value
}

function selectItem() {
  if (props.node.type === 'subsystem') {
    emit('select-subsystem', props.node.id)
  } else if (props.node.type === 'content') {
    emit('select-content', {
      type: props.node.contentType,
      id: props.node.entityId,
      name: props.node.name,
    })
  }
  // Модуль (node.type === 'module') – ничего не делаем при клике
}

function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Выполнено',
    'в эксплуатации': 'В эксплуатации',
    'на поверке': 'На поверке',
    выведено: 'Списано',
    активно: 'Активно',
  }
  return statuses[status] || status
}

function getStatusClass(status: string): string {
  if (status === 'completed' || status === 'активно') return 'status-success'
  if (status === 'in_progress' || status === 'в эксплуатации') return 'status-progress'
  if (status === 'выведено' || status === 'списано') return 'status-disabled'
  return 'status-pending'
}
</script>

<style scoped>
.tree-node {
  user-select: none;
}
.tree-node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}
.tree-node-header:hover {
  background-color: #f0f2f5;
}
.tree-node-header.has-children {
  font-weight: 500;
}
.tree-node-header.is-module {
  color: #2c5f8a;
  font-weight: 500;
  padding-left: 20px;
}
.tree-node-header.is-content {
  padding-left: 36px;
  font-weight: normal;
}
.tree-toggle {
  width: 20px;
  font-size: 12px;
  color: #2c5f8a;
}
.tree-toggle-placeholder {
  width: 20px;
}
.tree-icon {
  width: 24px;
  font-size: 14px;
}
.tree-node-label {
  flex: 1;
  font-size: 14px;
}
.tree-node-badge {
  background-color: #2c5f8a;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: normal;
}
.tree-node-status {
  margin-left: 8px;
}
.status-success {
  background-color: #27ae60;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
}
.status-progress {
  background-color: #e67e22;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
}
.status-pending {
  background-color: #3498db;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
}
.status-disabled {
  background-color: #95a5a6;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
}
.tree-node-children {
  margin-left: 24px;
  padding-left: 8px;
  border-left: 1px dashed #e0e4e8;
}
</style>
