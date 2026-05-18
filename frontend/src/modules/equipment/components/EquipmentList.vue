<template>
  <div class="card">
    <div class="header">
      <h2>Оборудование</h2>
      <button v-if="canEdit" class="btn btn-primary" @click="openForm">+ Добавить узел</button>
    </div>

    <div class="filter-panel">
      <input
        v-model="filters.search"
        placeholder="Поиск по наименованию"
        class="form-control"
        @input="applyFilters"
      />
      <select v-model="filters.status" class="form-control" @change="applyFilters">
        <option value="">Все статусы</option>
        <option value="получен">Получен</option>
        <option value="исправен">Исправен</option>
        <option value="неисправен">Неисправен</option>
        <option value="в ремонте">В ремонте</option>
        <option value="на поверке">На поверке</option>
        <option value="законсервирован">Законсервирован</option>
        <option value="списан">Списан</option>
      </select>
    </div>

    <div v-if="store.isLoading" class="loading">Загрузка...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th>Наименование</th>
          <th>Статус</th>
          <th>Местоположение</th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="node in store.nodes" :key="node.node_id">
          <td>{{ node.name }}</td>
          <td>{{ node.status }}</td>
          <td>{{ node.location }}</td>
          <td>
            <button class="btn-sm btn-secondary" @click="viewCard(node.node_id)">Открыть</button>
            <button v-if="canEdit" class="btn-sm btn-secondary" @click="editNode(node)">✏️</button>
            <button v-if="canEdit" class="btn-sm btn-danger" @click="deleteNode(node.node_id)">Списать</button>
          </td>
        </tr>
      </tbody>
    </table>

    <EquipmentForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import EquipmentForm from './EquipmentForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const router = useRouter();
const store = useEquipmentStore();
const formRef = ref();
const confirmDialog = ref();
const filters = ref({ search: '', status: '' });

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  return user && ['operator', 'admin'].includes(JSON.parse(user).role);
});

function applyFilters() {
  store.setFilterParams(filters.value);
}

function viewCard(id: string) {
  router.push(`/equipment/${id}`);
}

function openForm() {
  formRef.value?.open();
}

function editNode(node: any) {
  formRef.value?.open(node);
}

async function deleteNode(id: string) {
  const ok = await confirmDialog.value?.show('Списание', 'Списать узел?');
  if (ok) await store.writeOffNode(id);
}

function refresh() {
  store.fetchNodes();
}

onMounted(() => {
  store.fetchNodes();
});
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.filter-panel {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.loading,
.error {
  text-align: center;
  padding: 20px;
}
</style>