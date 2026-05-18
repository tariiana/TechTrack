<template>
  <div class="card" v-if="node">
    <div class="header">
      <h2>{{ node.name }}</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editNode">Редактировать</button>
      </div>
    </div>

    <table class="info-table">
      <tr>
        <td><strong>Производитель</strong></td><td>{{ node.manufacturer || '-' }}</td>
        <td><strong>Модель</strong></td><td>{{ node.model || '-' }}</td>
      </tr>
      <tr>
        <td><strong>Зав. номер</strong></td><td>{{ node.serial_number || '-' }}</td>
        <td><strong>Инв. номер</strong></td><td>{{ node.inventory_number || '-' }}</td>
      </tr>
      <tr>
        <td><strong>Статус</strong></td><td>{{ node.status }}</td>
        <td><strong>Местоположение</strong></td><td>{{ node.location }}</td>
      </tr>
      <tr>
        <td><strong>Дата ввода</strong></td><td>{{ formatDate(node.commission_date) }}</td>
        <td><strong>Режим работы</strong></td><td>{{ node.operation_mode || '-' }}</td>
      </tr>
      <tr>
        <td><strong>Примечания</strong></td><td colspan="3">{{ node.note || '-' }}</td>
      </tr>
    </table>
    <div v-if="node.children && node.children.length">
      <h3>Состав (дочерние узлы)</h3>
      <table class="data-table">
        <thead>
          <tr><th>Наименование</th><th>Тип</th><th>Статус</th><th>Действия</th></tr>
        </thead>
        <tbody>
          <tr v-for="child in node.children" :key="child.node_id">
            <td>{{ child.name }}</td>
            <td>{{ child.node_type_name || '-' }}</td>
            <td>{{ child.status }}</td>
            <td><button class="btn-sm btn-secondary" @click="viewCard(child.node_id)">Открыть</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <EquipmentForm ref="formRef" @saved="refresh" />
  </div>
  <div v-else class="loading">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import EquipmentForm from '../components/EquipmentForm.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useEquipmentStore();
const formRef = ref();
const node = ref<any>(null);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  return user && ['operator', 'admin'].includes(JSON.parse(user).role);
});

async function loadData() {
  const id = route.params.id as string;
  node.value = await store.fetchNodeById(id);
}

function goBack() {
  router.back();
}

function editNode() {
  formRef.value?.open(node.value);
}

function refresh() {
  loadData();
}

function viewCard(id: string) {
  router.push(`/equipment/${id}`);
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
  margin-bottom: 20px;
}
.info-table td {
  padding: 8px;
  border: 1px solid #e0e4e8;
}
.info-table td:first-child {
  width: 150px;
  background: #f8f9fa;
}
.loading {
  text-align: center;
  padding: 40px;
}
</style>