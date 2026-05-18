<template>
  <div class="card" v-if="subsystem">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>{{ subsystem.name }}</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button class="btn btn-primary" @click="editSubsystem">Редактировать</button>
        <button class="btn btn-danger" @click="deleteSubsystem">Удалить</button>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">ID</div>
        <div class="info-value">{{ subsystem.subsys_id }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Наименование</div>
        <div class="info-value">{{ subsystem.name }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Расположение</div>
        <div class="info-value">{{ subsystem.location || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Родительская подсистема</div>
        <div class="info-value">{{ getParentName() }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Примечания</div>
        <div class="info-value">{{ subsystem.note || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата создания</div>
        <div class="info-value">{{ formatDate(subsystem.created_at) }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата обновления</div>
        <div class="info-value">{{ formatDate(subsystem.updated_at) }}</div>
      </div>
    </div>

    <SubsystemForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSubsystemStore } from '../stores/subsystemsStore'
import SubsystemForm from './SubsystemForm.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { formatDate } from '@/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const store = useSubsystemStore()
const formRef = ref()
const confirmDialog = ref()

const subsystem = ref<any>(null)

function getParentName(): string {
  if (!subsystem.value?.parent_id) return '-'
  const parent = store.subsystems.find(s => s.subsys_id === subsystem.value.parent_id)
  return parent ? parent.name : '-'
}

async function loadData() {
  const id = route.params.id as string
  // Получаем все подсистемы и находим нужную
  await store.fetchAll()
  subsystem.value = store.subsystems.find(s => s.subsys_id === id)
}

function goBack() {
  router.back()
}

function editSubsystem() {
  formRef.value?.open(subsystem.value)
}

async function deleteSubsystem() {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить подсистему?')
  if (ok) {
    await store.remove(subsystem.value.subsys_id)
    router.back()
  }
}

function refresh() {
  loadData()
}

onMounted(() => {
  loadData()
  window.addEventListener('subsystem-saved', refresh)
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
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  font-weight: 600;
  color: #2c3e50;
}
.info-value {
  color: #1a2a3a;
}
</style>