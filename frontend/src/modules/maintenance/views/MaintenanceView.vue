<template>
  <div class="card">
    <div class="header">
      <h2>Планы технического обслуживания</h2>
      <button class="btn btn-primary" @click="openForm">+ Создать план</button>
    </div>
    <div v-if="store.isLoading">Загрузка...</div>
    <table v-else class="data-table">
      <thead><tr><th>Название</th><th>Дата начала</th><th>Дата окончания</th><th>Действия</th></tr></thead>
      <tbody>
        <tr v-for="plan in store.plans" :key="plan.plan_id">
          <td>{{ plan.name }}</td>
          <td>{{ formatDate(plan.start_date) }}</td>
          <td>{{ plan.end_date ? formatDate(plan.end_date) : '—' }}</td>
          <td>
            <button class="btn-sm btn-secondary" @click="viewPlan(plan.plan_id)">Открыть</button>
            <button class="btn-sm btn-secondary" @click="editPlan(plan)">✏️</button>
            <button class="btn-sm btn-danger" @click="deletePlan(plan.plan_id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
    <PlanForm ref="formRef" @saved="refresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import PlanForm from '../components/MaintenancePlan.vue';
import { formatDate } from '@/utils/dateUtils';

const router = useRouter();
const store = useMaintenanceStore();
const formRef = ref();

function openForm() { formRef.value?.open(); }
function editPlan(plan: any) { formRef.value?.open(plan); }
async function deletePlan(id: string) { if (confirm('Удалить план?')) await store.deletePlan(id); }
function viewPlan(id: string) { router.push(`/maintenance/${id}`); }
function refresh() { store.fetchPlans(); }
onMounted(() => store.fetchPlans());
</script>