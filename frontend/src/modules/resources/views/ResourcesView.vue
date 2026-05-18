<template>
  <div class="card">
    <div class="header">
      <h2>Ресурсы</h2>
      <button v-if="canEdit" class="btn btn-primary" @click="openForm">+ Добавить ресурс</button>
    </div>

    <div class="filter-panel">
      <input v-model="filters.search" placeholder="Поиск" class="form-control" @input="applyFilters" />
      <select v-model="filters.node_id" class="form-control" @change="applyFilters">
        <option value="">Все узлы</option>
        <option v-for="node in nodes" :key="node.node_id" :value="node.node_id">{{ node.name }}</option>
      </select>
    </div>

    <div v-if="store.isLoading">Загрузка...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <table v-else class="data-table">
      <thead>
        <tr><th>Узел</th><th>Дата регистрации</th><th>Параметры</th><th>Действия</th></tr>
      </thead>
      <tbody>
        <tr v-for="res in store.resources" :key="res.resource_id">
          <td>{{ res.node_name || '-' }}</td>
          <td>{{ formatDate(res.registration_date) }}</td>
          <td><pre>{{ JSON.stringify(res.resource_params, null, 2) }}</pre></td>
          <td>
            <button class="btn-sm btn-secondary" @click="viewCard(res.resource_id)">Открыть</button>
            <button v-if="canEdit" class="btn-sm btn-secondary" @click="editResource(res)">✏️</button>
            <button v-if="canEdit" class="btn-sm btn-danger" @click="deleteResource(res.resource_id)">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>

    <ResourceForm ref="formRef" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import ResourceForm from '../components/ResourceForm.vue';
import { formatDate } from '@/utils/dateUtils';

const router = useRouter();
const store = useResourcesStore();
const formRef = ref();
const filters = ref({ search: '', node_id: '' });
const nodes = ref<any[]>([]); // можно загрузить из equipmentStore

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  return user && ['operator', 'admin'].includes(JSON.parse(user).role);
});

function applyFilters() {
  store.fetchResources(filters.value);
}

function openForm() { formRef.value?.open(); }
function editResource(res: any) { formRef.value?.open(res); }
async function deleteResource(id: string) {
  if (confirm('Удалить ресурс?')) await store.deleteResource(id);
}
function viewCard(id: string) { router.push(`/resources/${id}`); }
function refresh() { store.fetchResources(filters.value); }

onMounted(() => {
  store.fetchResources();
  // загрузить узлы для фильтра
  import('@/modules/equipment/stores/equipmentStore').then(({ useEquipmentStore }) => {
    const eqStore = useEquipmentStore();
    eqStore.fetchNodes().then(() => { nodes.value = eqStore.nodes; });
  });
});
</script>