<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Средства измерения</h2>
      <div class="action-buttons">
        <button v-if="canEdit" class="btn btn-primary btn-fixed" @click="openAddForm">+ Добавить СИ</button>
        <button class="btn btn-secondary btn-fixed" @click="openColumnSettings">⚙️ Колонки</button>
        
        <!-- Выпадающий список экспорта -->
        <div class="dropdown">
          <button class="btn btn-secondary btn-fixed" @click="toggleExportDropdown">
            📎 Экспорт {{ exportDropdownOpen ? '▲' : '▼' }}
          </button>
          <div v-if="exportDropdownOpen" class="dropdown-menu">
            <button class="dropdown-item" @click="exportToExcel">Microsoft Excel (.xlsx)</button>
            <button class="dropdown-item" @click="exportToWord">Microsoft Word (.docx)</button>
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px">
      <input v-model="filters.search" type="text" placeholder="Поиск по всем полям" class="form-control" style="width: 250px" @input="onSearchInput" />
      <select v-model="filters.status" class="form-control" style="width: 150px" @change="applyFilters">
        <option value="">Все статусы</option>
        <option value="в эксплуатации">В эксплуатации</option>
        <option value="на поверке">На поверке</option>
        <option value="в ремонте">В ремонте</option>
        <option value="списано">Списано</option>
      </select>
      <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
    </div>

    <!-- Таблица с прокруткой -->
    <ScrollableTable>
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="colKey in visibleOrderedColumns" :key="colKey" @click="sort(colKey)">
              {{ getColumnLabel(colKey) }}
              <span v-if="sortField === colKey">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="si in sortedList" :key="si.id" :class="getRowClass(si)" :title="getTooltip(si)">
            <td v-for="colKey in visibleOrderedColumns" :key="colKey">{{ formatCell(si, colKey) }}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-secondary" @click="viewCard(si.id)">Просмотр</button>
              <button v-if="canEdit && si.status !== 'списано'" class="btn btn-sm btn-secondary" @click="editSI(si)">✏️</button>
              <button v-if="canEdit && si.status !== 'списано'" class="btn btn-sm btn-danger" @click="writeOffSI(si.id)">📝 Списать</button>
              <span v-if="si.status === 'списано'" class="badge-disabled">Списано</span>
            </td>
          </tr>
          <tr v-if="sortedList.length === 0">
            <td :colspan="visibleOrderedColumns.length + 1">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </ScrollableTable>

    <SIForm ref="siFormRef" @si-saved="refresh" />
    <VerificationForm ref="verFormRef" @verification-saved="refresh" />
    <ColumnSettings ref="columnSettingsRef" />
    <ConfirmDialog ref="confirmDialog" />
    <ExportDialog ref="exportDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSIStore } from '../stores/siStore';
import SIForm from './SIForm.vue';
import VerificationForm from './VerificationForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ColumnSettings from './ColumnSettings.vue';
import ExportDialog from './ExportDialog.vue';
import ScrollableTable from '@/components/common/ScrollableTable.vue';
import { formatDate, getDaysUntilVerification } from '@/utils/dateUtils';
import { showToast } from '@/utils/toast';

const router = useRouter();
const store = useSIStore();
const columnSettingsRef = ref();
const exportDialogRef = ref();
const siFormRef = ref();
const verFormRef = ref();
const confirmDialog = ref();

const COLUMN_LABELS: Record<string, string> = {
  name: 'Наименование',
  manufacturer: 'Производитель',
  model: 'Марка',
  serialNumber: 'Зав. №',
  inventoryNumber: 'Инв. №',
  tabNumber: 'Таб. №',
  status: 'Статус',
  lastVerificationDate: 'Дата поверки',
  nextVerificationDate: 'Следующая поверка',
  verificationInterval: 'Межповерочный интервал',
  location: 'Размещение',
  notes: 'Примечание',
};

type ColumnKey = keyof typeof COLUMN_LABELS;

const allColumnKeys: ColumnKey[] = [
  'name', 'manufacturer', 'model', 'serialNumber', 'inventoryNumber',
  'tabNumber', 'status', 'lastVerificationDate', 'nextVerificationDate',
  'verificationInterval', 'location', 'notes'
];

const visibleColumns = ref<Record<ColumnKey, boolean>>({
  name: true, manufacturer: true, model: true, serialNumber: true,
  inventoryNumber: true, tabNumber: true, status: true, lastVerificationDate: true,
  nextVerificationDate: true, verificationInterval: true, location: true, notes: true,
});

const columnOrder = ref<ColumnKey[]>([
  'name', 'manufacturer', 'model', 'serialNumber', 'inventoryNumber',
  'tabNumber', 'status', 'lastVerificationDate', 'nextVerificationDate',
  'verificationInterval', 'location', 'notes'
]);

const filters = ref({ search: '', status: '' });
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const sortField = ref<ColumnKey>('tabNumber');
const sortDir = ref<'asc' | 'desc'>('asc');
const exportDropdownOpen = ref(false);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

const visibleOrderedColumns = computed(() => {
  return columnOrder.value.filter(key => visibleColumns.value[key]);
});

function getColumnLabel(key: ColumnKey): string {
  return COLUMN_LABELS[key] || key;
}

function loadColumnSettings() {
  const saved = localStorage.getItem('si_column_visibility');
  if (saved) {
    const parsed = JSON.parse(saved);
    for (const key of allColumnKeys) {
      if (typeof parsed[key] === 'boolean') visibleColumns.value[key] = parsed[key];
    }
  }
  const savedOrder = localStorage.getItem('si_column_order');
  if (savedOrder) {
    const parsed = JSON.parse(savedOrder);
    if (Array.isArray(parsed) && parsed.length) {
      columnOrder.value = parsed.filter((k: string) => allColumnKeys.includes(k as ColumnKey));
    }
  }
}

function onColumnSettingsChange() { loadColumnSettings(); }
function openColumnSettings() { columnSettingsRef.value?.open(); }

function getLastVerificationDate(id: number): string { return store.getLastVerificationDate(id); }
function getNextVerificationDate(id: number): string { return store.getNextVerificationDate(id); }

function formatCell(si: any, key: ColumnKey): string {
  if (key === 'lastVerificationDate') {
    const date = getLastVerificationDate(si.id);
    return date ? formatDate(date) : '-';
  }
  if (key === 'nextVerificationDate') {
    const date = getNextVerificationDate(si.id);
    return date ? formatDate(date) : '-';
  }
  if (key === 'verificationInterval') return `${si.verificationInterval} год`;
  if (key === 'status') {
    return si.status === 'списано' ? 'Списано' : si.status;
  }
  const value = si[key];
  return value === undefined || value === null ? '-' : String(value);
}

function getDaysLeft(si: any): number {
  if (si.status === 'списано') return Infinity;
  const nextDate = getNextVerificationDate(si.id);
  if (!nextDate) return Infinity;
  return getDaysUntilVerification(nextDate);
}

function getPriority(si: any): number {
  if (si.status === 'списано') return 999; // списанные - в конец
  const daysLeft = getDaysLeft(si);
  if (daysLeft < 0) return 0;
  if (daysLeft <= 30) return 1;
  return 2;
}

const sortedList = computed(() => {
  let list = [...store.instruments];
  
  // Сначала сортируем по приоритету (цвету)
  list.sort((a, b) => {
    const priorityA = getPriority(a);
    const priorityB = getPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    // Если приоритет одинаковый, сортируем по выбранному полю
    const field = sortField.value;
    let valA: any = a[field];
    let valB: any = b[field];
    
    if (field === 'lastVerificationDate') {
      valA = getLastVerificationDate(a.id);
      valB = getLastVerificationDate(b.id);
    }
    if (field === 'nextVerificationDate') {
      valA = getNextVerificationDate(a.id);
      valB = getNextVerificationDate(b.id);
    }
    
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';
    
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDir.value === 'asc' ? valA - valB : valB - valA;
    }
    
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return sortDir.value === 'asc' ? -1 : 1;
    if (strA > strB) return sortDir.value === 'asc' ? 1 : -1;
    return 0;
  });
  
  return list;
});

function sort(field: ColumnKey) {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  else { sortField.value = field; sortDir.value = 'asc'; }
}

function applyFilters() { store.setFilterParams({ search: filters.value.search, status: filters.value.status }); }
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  const searchText = filters.value.search;
  if (!searchText || searchText.length < 2) { applyFilters(); return; }
  searchTimer = setTimeout(() => { applyFilters(); searchTimer = null; }, 300);
}
function resetFilters() { filters.value = { search: '', status: '' }; if (searchTimer) clearTimeout(searchTimer); applyFilters(); }

function getRowClass(si: any): string {
  if (si.status === 'списано') return 'disabled-row';
  const days = getDaysLeft(si);
  if (days < 0) return 'expired-row';
  if (days <= 30) return 'warning-row';
  return '';
}

function getDaysWord(days: number): string {
  const lastDigit = days % 10, lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

function getTooltip(si: any): string {
  if (si.status === 'списано') return 'Прибор списан, не используется';
  const days = getDaysLeft(si);
  const nextDate = getNextVerificationDate(si.id);
  if (!nextDate) return 'Поверки ещё не проводились';
  if (days < 0) return `Поверка просрочена на ${Math.abs(days)} ${getDaysWord(Math.abs(days))}! Необходимо срочно отправить на поверку!`;
  if (days <= 30) return `До окончания срока поверки осталось ${days} ${getDaysWord(days)}. Рекомендуется запланировать поверку.`;
  return `Следующая поверка через ${days} ${getDaysWord(days)}`;
}

function viewCard(id: number) { router.push(`/si/${id}`); }

function openAddForm() { siFormRef.value?.open(); }

function editSI(si: any) { siFormRef.value?.open(si); }

async function writeOffSI(id: number) {
  const ok = await confirmDialog.value?.show('Списание', 'Вы уверены что хотите списать СИ?');
  if (ok) {
    await store.writeOffInstrument(id);
    showToast('СИ успешно списано', 'success');
  }
}

function refresh() { applyFilters(); }

function toggleExportDropdown() {
  exportDropdownOpen.value = !exportDropdownOpen.value;
}

function closeExportDropdown() {
  exportDropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.dropdown')) {
    exportDropdownOpen.value = false;
  }
}

async function exportToExcel() {
  const data = sortedList.value;
  const columns = visibleOrderedColumns.value;
  const columnLabels = columns.map(key => getColumnLabel(key));
  await exportDialogRef.value?.exportDirect(data, columns, columnLabels, 'excel');
  closeExportDropdown();
}

async function exportToWord() {
  const data = sortedList.value;
  const columns = visibleOrderedColumns.value;
  const columnLabels = columns.map(key => getColumnLabel(key));
  await exportDialogRef.value?.exportDirect(data, columns, columnLabels, 'word');
  closeExportDropdown();
}

onMounted(() => {
  loadColumnSettings();
  store.fetchInstruments();
  window.addEventListener('column-settings-changed', onColumnSettingsChange);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('column-settings-changed', onColumnSettingsChange);
  document.removeEventListener('click', handleClickOutside);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.action-buttons { display: flex; gap: 10px; }
.btn-fixed { min-width: 140px; text-align: center; }
.badge-disabled { display: inline-block; padding: 4px 8px; background-color: #e9ecef; color: #6c757d; border-radius: 4px; font-size: 12px; }
.actions-cell { white-space: nowrap; }
.actions-cell .btn { margin-right: 4px; }
.warning-row { background-color: #ffd699; }
.warning-row:hover { background-color: #ffbb55; }
.expired-row { background-color: #ffb3b3; }
.expired-row:hover { background-color: #ff8080; }
.disabled-row { background-color: #e0e0e0; color: #999; opacity: 0.7; }
.disabled-row:hover { background-color: #d0d0d0; }
.card { overflow-x: hidden; }
.scrollable-table-container { width: 100%; }
:deep(.scrollable-table-container) {
  height: 650px;
  max-height: calc(100vh - 250px);
}
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 200px;
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

.dropdown-item:hover {
  background-color: #f0f2f5;
}
</style>