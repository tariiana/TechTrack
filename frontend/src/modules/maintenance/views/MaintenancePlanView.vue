<template>
  <div class="card" v-if="plan">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px;">
      <h2 style="margin: 0;">{{ plan.name }}</h2>
      <div style="display: flex; gap: 10px;">
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editPlan">Редактировать</button>
        <button v-if="canEdit" class="btn btn-danger" @click="deletePlan">Удалить</button>
      </div>
    </div>

    <div class="plan-info">
      <p><strong>Период:</strong> {{ formatDate(plan.start_date) }} — {{ plan.end_date ? formatDate(plan.end_date) : '∞' }}</p>
      <p v-if="plan.description"><strong>Описание:</strong> {{ plan.description }}</p>
    </div>

    <div class="filter-row">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Поиск по всем полям..."
        class="form-control"
        style="width: 300px"
        @input="applyFilters"
      />
      <select v-model="statusFilter" class="form-control" style="width: 150px" @change="applyFilters">
        <option value="">Все статусы</option>
        <option value="pending">Ожидает</option>
        <option value="in_progress">В работе</option>
        <option value="completed">Выполнено</option>
        <option value="not_completed">Не выполнено</option>
      </select>
      <select v-model="serviceTypeFilter" class="form-control" style="width: 180px" @change="applyFilters">
        <option value="">Все типы ТО</option>
        <option value="плановое ТО">Плановое ТО</option>
        <option value="внеплановое ТО">Внеплановое ТО</option>
        <option value="капитальный ремонт">Капитальный ремонт</option>
        <option value="текущий ремонт">Текущий ремонт</option>
        <option value="аварийный ремонт">Аварийный ремонт</option>
        <option value="модернизация">Модернизация</option>
      </select>
      <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
    </div>
    <br>

    <div class="table-scroll-container">
      <table class="data-table">
        <thead>
          <tr>
            <th @click="sortBy('index')">№ п/п</th>
            <th @click="sortBy('node_name')">Наименование агрегата</th>
            <th @click="sortBy('location')">Местоположение</th>
            <th @click="sortBy('expiry_date')">Дата истечения срока ТО</th>
            <th @click="sortBy('completed_date')">Дата проведения ТО</th>
            <th @click="sortBy('service_type')">Тип обслуживания</th>
            <th @click="sortBy('status_name')">Статус</th>
            <th @click="sortBy('notes')">Примечание</th>
            <th v-if="canEdit">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(task, index) in filteredAndSortedTasks" 
            :key="task.maintenance_id" 
            :class="getRowClass(task)"
            :title="getTooltip(task)"
          >
            <td>{{ index + 1 }}</td>
            <td>
              <button class="link-btn" @click="goToNode(task.node_id)">
                {{ task.node_name }}
              </button>
            </td>
            <td>{{ getLocation(task.node_id) || '-' }}</td>
            <td>{{ formatDate(task.expiry_date) }}</td>
            <td>
              <template v-if="task.completed_date">
                {{ formatDate(task.completed_date) }}
                <span v-if="getDaysDiff(task.expiry_date, task.completed_date) > 0" class="overdue-completed-badge">
                  (просрочено на {{ getDaysDiff(task.expiry_date, task.completed_date) }} дн.)
                </span>
                <span v-if="task.status_name === 'completed'" class="success-check">✅</span>
              </template>
              <template v-else>
                <span class="not-completed">—</span>
                <span v-if="getDaysDiff(task.expiry_date) < 0" class="overdue-badge">
                  просрочено на {{ Math.abs(getDaysDiff(task.expiry_date)) }} дн.
                </span>
              </template>
            </td>
            <td>{{ task.service_type }}</td>
            <td>
              {{ getStatusText(task.status_name) }}
              <span v-if="task.status_name !== 'completed' && getDaysDiff(task.expiry_date) > 0" class="overdue-badge">
                просрочено на {{ getDaysDiff(task.expiry_date) }} дн.
              </span>
              <span v-if="task.status_name === 'completed' && task.completed_date && getDaysDiff(task.expiry_date, task.completed_date) > 0" class="overdue-completed-badge">
                опоздание на {{ getDaysDiff(task.expiry_date, task.completed_date) }} дн.
              </span>
            </td>
            <td>{{ task.notes || '-' }}</td>
            <td v-if="canEdit">
              <button class="btn btn-sm btn-secondary" @click="openEditTaskForm(task)">✏️</button>
              <button class="btn btn-sm btn-danger" @click="deleteTask(task.maintenance_id)">🗑️</button>
            </td>
          </tr>
          <tr v-if="filteredAndSortedTasks.length === 0">
            <td :colspan="canEdit ? 9 : 8">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="action-bar">
      <div class="button-group">
        <div class="dropdown" ref="exportDropdownRef">
          <button class="btn btn-secondary" @click="toggleExportDropdown">
            📎 Экспорт плана {{ exportDropdownOpen ? '▲' : '▼' }}
          </button>
          <div v-if="exportDropdownOpen" class="dropdown-menu-right">
            <button class="dropdown-item" @click="exportTasksToExcel">Excel</button>
            <button class="dropdown-item" @click="exportTasksToWord">Word</button>
          </div>
        </div>
        <button class="btn btn-secondary" @click="openChartModal">📊 График нагрузки</button>
        <button class="btn btn-secondary" @click="openCalendarModal">📅 Календарь</button>
        <button v-if="canEdit" class="btn btn-primary" @click="openAddTaskForm">+ Добавить мероприятие</button>
      </div>
    </div>

    <MaintenanceTaskForm 
      ref="taskFormRef" 
      :tasks="tasks"
      @saved="refresh" 
    />
    <MaintenanceForm ref="planFormRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
    <ChartModal
      ref="chartModalRef"
      :plan-name="plan?.name || ''"
      :plan-period="`${formatDate(plan?.start_date)} — ${plan?.end_date ? formatDate(plan?.end_date) : '∞'}`"
      :tasks="tasks"
    />
    <CalendarModal
      ref="calendarModalRef"
      :tasks="tasks"
    />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import CalendarModal from '../components/CalendarModal.vue';
import { showToast } from '@/utils/toast';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';
import MaintenanceTaskForm from '../components/MaintenanceTaskForm.vue';
import MaintenanceForm from '../components/MaintenanceForm.vue';
import ChartModal from '../components/ChartModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import * as exportUtils from '@/utils/exportUtils';
import * as XLSX from 'xlsx';

const route = useRoute();
const router = useRouter();
const maintenanceStore = useMaintenanceStore();
const equipmentStore = useEquipmentStore();
const props = defineProps<{
  embedded?: boolean;
  embeddedId?: string | number | null;
}>();
const emit = defineEmits<{
  (event: 'back'): void;
}>();
const taskFormRef = ref();
const planFormRef = ref();
const confirmDialog = ref();
const chartModalRef = ref();
const calendarModalRef = ref();
const exportDropdownRef = ref();

const plan = ref<any>(null);
const tasks = ref<any[]>([]);
const searchQuery = ref('');
const statusFilter = ref('');
const serviceTypeFilter = ref('');
const exportDropdownOpen = ref(false);

const sortField = ref<'node_name' | 'location' | 'expiry_date' | 'completed_date' | 'service_type' | 'status_name' | 'notes'>('expiry_date');
const sortOrder = ref<'asc' | 'desc'>('asc');
const targetPlanId = computed(() => {
  const id = props.embedded ? props.embeddedId : route.params.id;
  return id ? String(id) : '';
});

const canEdit = computed(() => {
  if (props.embedded) return false;
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function getLocation(nodeId: number): string {
  const node = equipmentStore.nodes.find((n: any) => n.node_id === nodeId);
  return node?.location || node?.parent_location || '-';
}

function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    pending: 'Ожидает',
    in_progress: 'В работе',
    completed: 'Выполнено',
    not_completed: 'Не выполнено',
  };
  return statuses[status] || status;
}

function getDaysDiff(expiryDate: string, completedDate?: string): number {
  if (!expiryDate) return Infinity;
  
  let targetDate = new Date();
  targetDate.setHours(0, 0, 0, 0);
  
  if (completedDate) {
    targetDate = new Date(completedDate);
    targetDate.setHours(0, 0, 0, 0);
  }
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  if (targetDate <= expiry) {
    return 0;
  }
  
  const diff = Math.ceil((targetDate.getTime() - expiry.getTime()) / (1000 * 3600 * 24));
  return diff;
}

function getRowClass(task: any): string {
  if (task.status_name === 'completed') {
    return '';
  }
  
  const daysDiff = getDaysDiff(task.expiry_date);
  
  if (daysDiff > 0) {
    return 'expired-row';
  }
  
  if (daysDiff <= 30 && daysDiff > 0) {
    return 'warning-row';
  }
  
  return '';
}

function getTooltip(task: any): string {
  if (task.status_name === 'completed') return '';
  const daysDiff = getDaysDiff(task.expiry_date);
  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    const daysWord = getDaysWord(overdueDays);
    return `⚠️ Просрочено на ${overdueDays} ${daysWord}! Необходимо срочно провести ТО!`;
  }
  if (daysDiff <= 30) {
    const daysWord = getDaysWord(daysDiff);
    return `⏰ До истечения срока ТО осталось ${daysDiff} ${daysWord}. Рекомендуется запланировать проведение ТО.`;
  }
  return '';
}

function getDaysWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

function openChartModal() {
  chartModalRef.value?.open();
}

function openCalendarModal() {
  calendarModalRef.value?.open();
}

async function loadData() {
  const id = targetPlanId.value;
  if (!id) return;
  plan.value = await maintenanceStore.fetchPlanById(id);
  if (plan.value) {
    tasks.value = plan.value.tasks || [];
  }
}

function sortBy(field: string) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field as any;
    sortOrder.value = 'asc';
  }
}

const filteredAndSortedTasks = computed(() => {
  let list = [...tasks.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    list = list.filter((t) => {
      return (
        (t.node_name && t.node_name.toLowerCase().includes(query)) ||
        (t.service_type && t.service_type.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query)) ||
        (getLocation(t.node_id) && getLocation(t.node_id).toLowerCase().includes(query))
      );
    });
  }

  if (statusFilter.value) {
    list = list.filter((t) => t.status_name === statusFilter.value);
  }

  if (serviceTypeFilter.value) {
    list = list.filter((t) => t.service_type === serviceTypeFilter.value);
  }

  list.sort((a, b) => {
    let valA = a[sortField.value];
    let valB = b[sortField.value];
    if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });

  return list;
});

function applyFilters() {}
function resetFilters() {
  searchQuery.value = '';
  statusFilter.value = '';
  serviceTypeFilter.value = '';
}

function goBack() {
  if (props.embedded) {
    emit('back');
    return;
  }
  router.back();
}
function editPlan() { planFormRef.value?.open(plan.value); }

async function deletePlan() {
  if (!canEdit.value) return;
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить план?');
  if (ok) {
    await maintenanceStore.deletePlan(plan.value.plan_id);
    showToast('План успешно удалён', 'success');
    goBack();
  }
}

function goToNode(nodeId: number) {
  if (props.embedded) return;
  router.push(`/equipment/${nodeId}`);
}
function openAddTaskForm() { 
  if (!canEdit.value) return;
  taskFormRef.value?.open(plan.value.plan_id); 
}
function openEditTaskForm(task: any) { 
  if (!canEdit.value) return;
  taskFormRef.value?.open(plan.value.plan_id, task); 
}

async function deleteTask(id: number) {
  if (!canEdit.value) return;
  const ok = await confirmDialog.value?.show('Удаление', 'Вы точно хотите удалить мероприятие?');
  if (ok) {
    await maintenanceStore.deleteTask(id);
    showToast('Мероприятие успешно удалено', 'success');
    refresh();
  }
}

function refresh() { loadData(); }

function getTasksExportData() {
  return filteredAndSortedTasks.value.map((t, idx) => ({
    '№ п/п': idx + 1,
    'Наименование агрегата': t.node_name,
    'Местоположение': getLocation(t.node_id) || '-',
    'Дата истечения срока ТО': t.expiry_date ? formatDate(t.expiry_date) : '',
    'Фактическая дата проведения ТО': t.completed_date ? formatDate(t.completed_date) : '',
    'Тип обслуживания': t.service_type,
    'Статус': getStatusText(t.status_name),
    'Примечание': t.notes || '-',
  }));
}

function exportTasksToExcel() {
  const data = getTasksExportData()
  if (data.length === 0) {
    showToast('Нет данных для экспорта', 'error');
    return
  }

  const excelRows = [];
  excelRows.push([`${plan.value.name}`]);
  excelRows.push([]);
  excelRows.push(['№ п/п', 'Наименование агрегата', 'Местоположение', 'Дата истечения срока ТО', 'Фактическая дата проведения ТО', 'Тип обслуживания', 'Статус', 'Примечание']);

  data.forEach((row) => {
    excelRows.push([
      row['№ п/п'],
      row['Наименование агрегата'],
      row['Местоположение'],
      row['Дата истечения срока ТО'],
      row['Фактическая дата проведения ТО'],
      row['Тип обслуживания'],
      row['Статус'],
      row['Примечание'],
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'План ТО');
  const filename = `${plan.value.name.replace(/\s/g, '_')}.xlsx`;
  XLSX.writeFile(wb, filename);
  exportDropdownOpen.value = false;
  showToast('Экспорт плана в Excel выполнен успешно', 'success');
}

function exportTasksToWord() {
  const data = getTasksExportData()
  if (data.length === 0) {
    showToast('Нет данных для экспорта', 'error');
    return
  }
  const headers = ['№ п/п', 'Наименование агрегата', 'Местоположение', 'Дата истечения срока ТО', 'Фактическая дата проведения ТО', 'Тип обслуживания', 'Статус', 'Примечание'];
  const filename = `${plan.value.name.replace(/\s/g, '_')}`;
  exportUtils.exportToWord(data, headers, filename);
  exportDropdownOpen.value = false;
  showToast('Экспорт плана в Word выполнен успешно', 'success');
}

function toggleExportDropdown() { 
  exportDropdownOpen.value = !exportDropdownOpen.value; 
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (exportDropdownRef.value && !exportDropdownRef.value.contains(target)) {
    exportDropdownOpen.value = false;
  }
}

watch(targetPlanId, loadData, { immediate: true });

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  window.addEventListener('plan-saved', refresh);
  window.addEventListener('task-saved', refresh);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  window.removeEventListener('plan-saved', refresh);
  window.removeEventListener('task-saved', refresh);
});

</script>

<style scoped>
.plan-info {
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.plan-info p { margin: 4px 0; }
.action-bar { margin-top: 20px; display: flex; justify-content: flex-end; }
.button-group { display: flex; gap: 10px; position: relative; }
.dropdown { position: relative; }
.dropdown-menu-right {
  position: absolute;
  top: 100%;
  right: 0;
  left: auto;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 150px;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
.dropdown-item:hover { background-color: #f0f2f5; }
.filter-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.link-btn {
  background: none;
  border: none;
  color: #2c5f8a;
  cursor: pointer;
  font-size: 15px;
  text-align: left;
}
.link-btn:hover { color: #1e4566; }
.success-check { margin-left: 5px; font-size: 14px; }
.not-completed { color: #999; }
.sort-icon { margin-left: 5px; font-size: 12px; color: #2c5f8a; }
.overdue-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #c0392b;
  color: white;
  border-radius: 4px;
  font-size: 10px;
}
.overdue-completed-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #e67e22;
  color: white;
  border-radius: 4px;
  font-size: 10px;
}
.warning-row { background-color: #ffd699; }
.warning-row:hover { background-color: #ffbb55; }
.expired-row { background-color: #ffb3b3; }
.expired-row:hover { background-color: #ff8080; }
</style>
