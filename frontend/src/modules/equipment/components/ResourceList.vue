<template>
  <div>
    <div class="resource-header">
      <h3>Ресурсы</h3>
      <div class="resource-actions">
        <button class="btn btn-sm btn-secondary" @click="goToResources">📊 Полный учёт</button>
        <button v-if="canEdit" class="btn btn-sm btn-primary" @click="$emit('add')">+ Добавить ресурс</button>
      </div>
    </div>

    <div v-if="isLoading" class="loading">Загрузка...</div>
    <table v-else-if="resources.length" class="data-table">
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
          <td>{{ formatDate(res.updated_at || res.updatedAt) }}</td>
          <td v-if="canEdit">
            <button class="btn btn-sm btn-secondary" @click="$emit('edit', res)">✏️</button>
            <button class="btn btn-sm btn-danger" @click="deleteResource(res.resource_id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="empty-message">Ресурсы не добавлены</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useResourcesStore } from '@/modules/resources/stores/resourcesStore';
import { formatDate } from '@/utils/dateUtils';

const props = defineProps<{ nodeId: string }>();
const emit = defineEmits(['add', 'edit']);
const router = useRouter();
const resourcesStore = useResourcesStore();

const resources = ref<any[]>([]);
const isLoading = ref(false);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

async function loadResources() {
  isLoading.value = true;
  try {
    resources.value = await resourcesStore.fetchResourcesForNode(props.nodeId);
  } catch (err) {
    console.error('Ошибка загрузки ресурсов:', err);
    resources.value = [];
  } finally {
    isLoading.value = false;
  }
}

function goToResources() {
  router.push({ path: '/resources', query: { nodeId: props.nodeId } });
}

async function deleteResource(id: string) {
  if (confirm('Удалить ресурс?')) {
    await resourcesStore.deleteResource(id);
    await loadResources();
    window.dispatchEvent(new Event('resource-saved'));
  }
}

function handleResourceSaved() {
  loadResources();
}

onMounted(() => {
  loadResources();
  window.addEventListener('resource-saved', handleResourceSaved);
});

onUnmounted(() => {
  window.removeEventListener('resource-saved', handleResourceSaved);
});

watch(() => props.nodeId, () => {
  loadResources();
});
</script>

<style scoped>
.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.resource-actions {
  display: flex;
  gap: 8px;
}
.empty-message {
  color: #999;
  font-style: italic;
  padding: 10px;
}
.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}
</style>