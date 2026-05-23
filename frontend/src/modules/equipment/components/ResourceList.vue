<template>
  <div v-if="resources.length" class="resource-table-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th>Наименование</th>
          <th>Значение</th>
          <th>Ед. изм.</th>
          <th>Дата регистрации</th>
          <th>Примечание</th>
          <th v-if="canEdit">Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="res in resources" :key="res.id || res.registration_date">
        <td>
  <span class="clickable-link" @click="$emit('goToResource', res.id || res.resource_id)">
    {{ res.resource_params?.name || res.name || 'Ресурс' }}
  </span>
</td>
          <td>{{ res.resource_params?.value ?? res.value ?? '-' }}</td>
          <td>{{ res.resource_params?.unit || res.unit || '-' }}</td>
          <td>{{ formatDate(res.registration_date) }}</td>
          <td>{{ res.note || '-' }}</td>
          <td v-if="canEdit">
            <button class="btn btn-sm btn-secondary" @click="$emit('edit', res)">✏️</button>
            <button class="btn btn-sm btn-danger" @click="$emit('delete', res.node_id || res.id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-else class="empty-message">Ресурсы не добавлены</div>
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/dateUtils';

defineProps<{
  resources: any[];
  canEdit: boolean;
}>();

defineEmits(['edit', 'delete', 'goToResource']);
</script>


<style scoped>
.resource-table-wrapper { overflow-x: auto; margin-top: 8px; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
.data-table th { background: #f1f5f9; font-weight: 600; }
.btn-sm { padding: 4px 8px; font-size: 12px; margin-right: 4px; }
.empty-message { color: #94a3b8; font-style: italic; padding: 12px; text-align: center; }
.clickable-link { cursor: pointer; color: #1976d2; text-decoration: none; }
.clickable-link:hover { text-decoration: underline; }

.resource-table-wrapper {
  overflow-x: auto;
  margin-top: 8px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
}
.data-table th {
  background: #f1f5f9;
  font-weight: 600;
}
.resource-name-cell {
  white-space: nowrap;
}
.resource-params-cell {
  max-width: 300px;
  word-break: break-word;
}
.resource-note-cell {
  max-width: 200px;
  word-break: break-word;
}
.actions-cell {
  white-space: nowrap;
}
.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
  margin-right: 4px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
}
.btn-secondary {
  background: #e0e4e8;
  color: #2c3e50;
  border: 1px solid #cbd5e1;
}
.btn-danger {
  background: #d32f2f;
  color: white;
}
.empty-message {
  color: #94a3b8;
  font-style: italic;
  padding: 12px;
  text-align: center;
}
.clickable-link {
  cursor: pointer;
  color: #1976d2;
  text-decoration: none;
}
.clickable-link:hover {
  text-decoration: underline;
}
</style>