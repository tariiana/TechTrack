<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Планы-графики технического обслуживания</h2>
      <div class="button-group">
        <div class="dropdown">
          <button class="btn btn-secondary" @click="toggleDropdown">📎 Экспорт</button>
          <div v-if="dropdownOpen" class="dropdown-menu">
            <button class="dropdown-item" @click="exportToExcel">Microsoft Excel (.xlsx)</button>
            <button class="dropdown-item" @click="exportToWord">Microsoft Word (.docx)</button>
          </div>
        </div>
        <button class="btn btn-primary" @click="openAddForm">+ Добавить план</button>
      </div>
    </div>

    <!-- Поиск и фильтры -->
    <div class="filter-panel">
      <div class="filter-row">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по названию"
          class="form-control"
          style="width: 250px"
          @input="applyFilters"
        />
        <input
          v-model="dateFrom"
          type="date"
          class="form-control"
          style="width: 180px"
          @change="applyFilters"
        />
        <span class="filter-label">—</span>
        <input
          v-model="dateTo"
          type="date"
          class="form-control"
          style="width: 180px"
          @change="applyFilters"
        />
        <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
      </div>
    </div>

    <!-- ОБЁРТКА ДЛЯ ТАБЛИЦЫ -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('name')">Название плана</th>
            <th @click="sortBy('startDate')">Дата начала</th>
            <th @click="sortBy('endDate')">Дата окончания</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plan in filteredAndSortedPlans" :key="plan.plan_id">
            <td>{{ plan.name }}</td>
            <td>{{ formatDate(plan.start_date) }}</td>
            <td>{{ plan.end_date ? formatDate(plan.end_date) : '—' }}</td>
            <td>
              <button class="btn btn-sm btn-secondary" @click="viewPlan(plan.plan_id)">Открыть</button>
              <button class="btn btn-sm btn-secondary" @click="editPlan(plan)">✏️</button>
              <button class="btn btn-sm btn-danger" @click="deletePlan(plan.plan_id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="filteredAndSortedPlans.length === 0">
            <td colspan="4">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Модальные окна -->
    <MaintenanceForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMaintenanceStore } from '../stores/maintenanceStore'
import MaintenanceForm from './MaintenanceForm.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import * as exportUtils from '@/utils/exportUtils'

const router = useRouter()
const store = useMaintenanceStore()
const formRef = ref()
const confirmDialog = ref()

// Фильтры
const searchQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const dropdownOpen = ref(false)

// Сортировка
const sortField = ref<'name' | 'startDate' | 'endDate'>('startDate')
const sortOrder = ref<'asc' | 'desc'>('asc')

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

function sortBy(field: 'name' | 'startDate' | 'endDate') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

const filteredAndSortedPlans = computed(() => {
  let list = [...store.plans]

  // Фильтрация по названию
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((p) => p.name.toLowerCase().includes(q))
  }

  // Фильтрация по диапазону дат
  if (dateFrom.value) {
    list = list.filter((p) => p.start_date >= dateFrom.value)
  }
  if (dateTo.value) {
    list = list.filter((p) => p.start_date <= dateTo.value)
  }

  // Сортировка
  list.sort((a, b) => {
    let valA = a[sortField.value === 'startDate' ? 'start_date' : sortField.value === 'endDate' ? 'end_date' : sortField.value]
    let valB = b[sortField.value === 'startDate' ? 'start_date' : sortField.value === 'endDate' ? 'end_date' : sortField.value]
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return list
})

function applyFilters() {
  // computed обновляется автоматически
}

function resetFilters() {
  searchQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

function viewPlan(id: string) {
  router.push(`/maintenance/${id}`)
}

function openAddForm() {
  formRef.value?.open()
}

function editPlan(plan: any) {
  formRef.value?.open(plan)
}

async function deletePlan(id: string) {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить план-график?')
  if (ok) store.deletePlan(id)
}

function refresh() {
  // реактивно
}

// Экспорт
function getExportData() {
  return filteredAndSortedPlans.value.map((p) => ({
    'Название плана': p.name,
    'Дата начала': formatDate(p.start_date),
    'Дата окончания': p.end_date ? formatDate(p.end_date) : '—',
  }))
}

function exportToExcel() {
  const data = getExportData()
  if (data.length === 0) {
    alert('Нет данных для экспорта')
    return
  }
  const filename = `Планы_ТО_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`
  exportUtils.exportToExcel(data, filename)
  dropdownOpen.value = false
}

function exportToWord() {
  const data = getExportData()
  if (data.length === 0) {
    alert('Нет данных для экспорта')
    return
  }
  const firstItem = data[0]
  if (!firstItem) return
  const headers = Object.keys(firstItem)
  const filename = `Планы_ТО_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`
  exportUtils.exportToWord(data, headers, filename)
  dropdownOpen.value = false
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.dropdown')) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* стили без изменений */
</style>