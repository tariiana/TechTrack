<template>
  <div class="card" v-if="resource">
    <div class="header">
      <h2>Ресурс #{{ resource.resource_id?.slice(0,8) }}</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editResource">Редактировать</button>
        <button v-if="canEdit" class="btn btn-danger" @click="deleteResource">Удалить</button>
      </div>
    </div>

    <table class="info-table">
      <tr><th>Узел</th><td colspan="3">{{ resource.node_name || resource.node_id }}</td></tr>
      <tr><th>Дата регистрации</th><td colspan="3">{{ formatDate(resource.registration_date) }}</td></tr>
      <tr><th>Параметры (JSON)</th><td colspan="3"><pre>{{ JSON.stringify(resource.resource_params, null, 2) }}</pre></td></tr>
      <tr><th>Примечания</th><td colspan="3">{{ resource.note || '-' }}</td></tr>
    </table>

    <ResourceForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="loading">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import ResourceForm from './ResourceForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useResourcesStore();
const formRef = ref();
const confirmDialog = ref();
const resource = ref<any>(null);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  return user && ['operator', 'admin'].includes(JSON.parse(user).role);
});

async function loadData() {
  const id = route.params.id as string;
  resource.value = await store.fetchResourceById(id);
}

function goBack() {
  router.back();
}

function editResource() {
  formRef.value?.open(resource.value);
}

async function deleteResource() {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить ресурс?');
  if (ok) {
    await store.deleteResource(resource.value.resource_id);
    router.back();
  }
}

function refresh() {
  loadData();
}

onMounted(loadData);
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.info-table {
  width: 100%;
  border-collapse: collapse;
}
.info-table th, .info-table td {
  border: 1px solid #e0e4e8;
  padding: 8px;
  vertical-align: top;
}
.info-table th {
  width: 150px;
  background: #f8f9fa;
}
.loading {
  text-align: center;
  padding: 40px;
}
</style>