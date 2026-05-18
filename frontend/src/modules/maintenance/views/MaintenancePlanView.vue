<template>
  <div class="card" v-if="plan">
    <div class="header">
      <h2>{{ plan.name }}</h2>
      <button class="btn btn-secondary" @click="goBack">← Назад</button>
    </div>
    <p><strong>Период:</strong> {{ formatDate(plan.start_date) }} — {{ plan.end_date ? formatDate(plan.end_date) : '∞' }}</p>

    <h3>Задачи</h3>
    <table class="data-table">
      <thead>
        <tr><th>Узел</th><th>Тип ТО</th><th>Статус</th><th>Дата создания</th><th>Действия</th></tr>
      </thead>
      <tbody>
        <tr v-for="task in plan.tasks" :key="task.maintenance_id">
          <td>{{ task.node_name }}</td>
          <td>{{ task.service_type }}</td>
          <td>{{ task.status_name }}</td>
          <td>{{ formatDate(task.created_at) }}</td>
          <td><button class="btn-sm btn-secondary" @click="editTask(task)">✏️</button></td>
        </tr>
      </tbody>
    </table>
    <TaskForm ref="taskFormRef" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import TaskForm from '../components/MaintenanceTaskForm.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useMaintenanceStore();
const plan = ref<any>(null);
const taskFormRef = ref();

async function load() {
  const id = route.params.id as string;
  plan.value = await store.fetchPlanById(id);
}
function goBack() { router.back(); }
function editTask(task: any) { taskFormRef.value?.open(task); }
function refresh() { load(); }
onMounted(load);
</script>