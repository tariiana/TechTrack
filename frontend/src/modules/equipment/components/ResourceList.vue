<template>
  <ScrollableTable v-if="resources.length">
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
  </ScrollableTable>
  <div v-else class="empty-message">Ресурсы не добавлены</div>
</template>

<script setup lang="ts">
import ScrollableTable from '@/components/common/ScrollableTable.vue';
import { formatDate } from '@/utils/dateUtils';

defineProps<{
  resources: any[];
  canEdit: boolean;
}>();

defineEmits(['edit', 'delete', 'goToResource']);
</script>

<style scoped>
.resource-table-wrapper {
  overflow-x: auto;
  margin-top: 8px;
}
.clickable-link {
  cursor: pointer;
  color: #1976d2;
  text-decoration: none;
}
.clickable-link:hover {
  text-decoration: underline;
}
/* .empty-message уже в глобальном стиле, но если нужно, можно оставить (он в глобальном есть) */
</style>