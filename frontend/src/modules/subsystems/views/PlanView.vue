<template>
  <div class="card" v-if="plan">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>{{ plan.name }}</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button class="btn btn-primary" @click="editPlan">Редактировать</button>
        <button class="btn btn-danger" @click="deletePlan">Удалить</button>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Период</div>
        <div class="info-value">
          {{ formatDate(plan.start_date) }} — {{ formatDate(plan.end_date) }}
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Описание</div>
        <div class="info-value">{{ plan.description || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата создания</div>
        <div class="info-value">{{ formatDate(plan.created_at) }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата обновления</div>
        <div class="info-value">{{ formatDate(plan.updated_at) }}</div>
      </div>
    </div>

    <MaintenanceForm ref="planFormRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMaintenanceStore } from '@/modules/maintenance/stores/maintenanceStore'
import MaintenanceForm from '@/modules/maintenance/components/MaintenanceForm.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { formatDate } from '@/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const store = useMaintenanceStore()
const planFormRef = ref()
const confirmDialog = ref()

const plan = ref<any>(null)

async function loadData() {
  const id = route.params.id as string
  plan.value = await store.fetchPlanById(id)
}

function goBack() {
  router.push('/maintenance')
}

function editPlan() {
  if (plan.value) {
    planFormRef.value?.open(plan.value)
  }
}

async function deletePlan() {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить план?')
  if (ok && plan.value) {
    await store.deletePlan(plan.value.plan_id)
    goBack()
  }
}

function refresh() {
  loadData()
}

onMounted(() => {
  loadData()
  window.addEventListener('plan-saved', refresh)
})
</script>

<style scoped>
/* стили без изменений */
.info-grid {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}
.info-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  padding: 8px 0;
  border-bottom: 1px solid #e0e4e8;
}
.info-row:last-child { border-bottom: none; }
.info-label { font-weight: 600; color: #2c3e50; }
.info-value { color: #1a2a3a; }
</style>