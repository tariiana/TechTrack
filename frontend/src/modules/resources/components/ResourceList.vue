<template>
  <div style="margin-top: 20px">
    <div class="resource-header">
      <h3>Ресурсы</h3>
      <button v-if="canEdit" class="btn btn-sm btn-primary" @click="$emit('add')">+ Добавить ресурс</button>
    </div>
    <div v-if="resources.length === 0" class="empty-message">Ресурсы не добавлены</div>
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Значение</th>
            <th>Ед. изм.</th>
            <th>Обновлено</th>
            <th v-if="canEdit">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="res in resources" :key="res.resource_id">
            <td>{{ res.name }}</td>
            <td>{{ res.value }}</td>
            <td>{{ res.unit || '-' }}</td>
            <td>{{ formatDate(res.updated_at) }}</td>
            <td v-if="canEdit">
              <button class="btn btn-sm btn-secondary" @click="$emit('edit', res)">✏️</button>
              <button class="btn btn-sm btn-danger" @click="$emit('delete', res.resource_id)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatDate } from '@/utils/dateUtils';

const props = defineProps<{ resources: any[] }>();
const emit = defineEmits(['add', 'edit', 'delete']);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  try {
    const role = JSON.parse(user).role;
    return role === 'operator' || role === 'admin';
  } catch {
    return false;
  }
});
</script>

<style scoped>
.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
</style>