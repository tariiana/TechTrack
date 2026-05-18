<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Средства измерения</h2>
      <div class="action-buttons">
        <button v-if="canEdit" class="btn btn-primary btn-fixed" @click="openAddForm">+ Добавить СИ</button>
        <button class="btn btn-secondary btn-fixed" @click="openColumnSettings">⚙️ Колонки</button>
        <button class="btn btn-secondary btn-fixed" @click="openExportDialog">📎 Экспорт</button>
      </div>
    </div>

    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px">
      <input v-model="filters.search" type="text" placeholder="Поиск по номеру/наименованию" class="form-control" style="width: 250px" @input="onSearchInput" />
      <select v-model="filters.status" class="form-control" style="width: 150px" @change="applyFilters">
        <option value="">Все статусы</option>
        <option value="в эксплуатации">В эксплуатации</option>
        <option value="на поверке">На поверке</option>
        <option value="в ремонте">В ремонте</option>
        <option value="выведено">Выведено</option>
      </select>
      <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
    </div>

    <div class="table-wrapper">
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
              <button v-if="canEdit && si.status !== 'выведено'" class="btn btn-sm btn-secondary" @click="editSI(si)">✏️</button>
              <button v-if="canEdit && si.status !== 'выведено'" class="btn btn-sm btn-danger" @click="writeOffSI(si.id)">📝 Списать</button>
              <span v-if="si.status === 'выведено'" class="badge-disabled">Списан</span>
            </td>
          </tr>
          <tr v-if="sortedList.length === 0"><td :colspan="visibleOrderedColumns.length + 1">Нет данных</td></tr>
        </tbody>
      </table>
    </div>

    <SIForm ref="siFormRef" @si-saved="refresh" />
    <VerificationForm ref="verFormRef" @verification-saved="refresh" />
    <ExportDialog ref="exportDialogRef" :data="exportDataList" />
    <ConfirmDialog ref="confirmDialog" />
    <ColumnSettings ref="columnSettingsRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSIStore } from '../stores/siStore';
import SIForm from './SIForm.vue';
import VerificationForm from './VerificationForm.vue';
import ExportDialog from './ExportDialog.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ColumnSettings from './ColumnSettings.vue';
import { formatDate, getDaysUntilVerification } from '@/utils/dateUtils';

const router = useRouter();
const store = useSIStore();
const columnSettingsRef = ref();

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

function getColumnLabel(key: ColumnKey): string {
  return COLUMN_LABELS[key] || key;
}

const visibleOrderedColumns = computed(() => {
  return columnOrder.value.filter(key => visibleColumns.value[key]);
});

function openColumnSettings() { columnSettingsRef.value?.open(); }
function onColumnSettingsChange() { loadColumnSettings(); }

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
  const value = si[key];
  if (value === undefined || value === null) return '-';
  return String(value);
}

const siFormRef = ref();
const verFormRef = ref();
const exportDialogRef = ref();
const confirmDialog = ref();

const filters = ref({ search: '', status: '' });
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const sortField = ref<ColumnKey>('tabNumber');
const sortDir = ref<'asc' | 'desc'>('asc');

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

function getDaysLeft(si: any): number {
  if (si.status === 'выведено') return Infinity;
  const nextDate = getNextVerificationDate(si.id);
  if (!nextDate) return Infinity;
  return getDaysUntilVerification(nextDate);
}

function getPriority(si: any): number {
  if (si.status === 'выведено') return 3;
  const daysLeft = getDaysLeft(si);
  if (daysLeft < 0) return 0;
  if (daysLeft <= 30) return 1;
  return 2;
}

const sortedList = computed(() => {
  let list = [...store.instruments];
  list.sort((a, b) => {
    const priorityA = getPriority(a), priorityB = getPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    const field = sortField.value;
    let valA: any = a[field], valB: any = b[field];
    if (field === 'lastVerificationDate') { valA = getLastVerificationDate(a.id); valB = getLastVerificationDate(b.id); }
    if (field === 'nextVerificationDate') { valA = getNextVerificationDate(a.id); valB = getNextVerificationDate(b.id); }
    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';
    if (typeof valA === 'number' && typeof valB === 'number') return sortDir.value === 'asc' ? valA - valB : valB - valA;
    const strA = String(valA).toLowerCase(), strB = String(valB).toLowerCase();
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
  if (si.status === 'выведено') return 'disabled-row';
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
  if (si.status === 'выведено') return 'Прибор списан, не используется';
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
  const ok = await confirmDialog.value?.show('Списание', 'Списать СИ?');
  if (ok) await store.writeOffInstrument(id);
}
function refresh() { applyFilters(); }
const exportDataList = computed(() => sortedList.value.map(si => ({ ...si, lastVerificationDate: getLastVerificationDate(si.id), nextVerificationDate: getNextVerificationDate(si.id) })));
function openExportDialog() { exportDialogRef.value?.open(exportDataList.value); }

onMounted(() => {
  loadColumnSettings();
  store.fetchInstruments();
  window.addEventListener('column-settings-changed', onColumnSettingsChange);
});
</script>

<style scoped>
.action-buttons { display: flex; gap: 10px; }
.btn-fixed { min-width: 140px; text-align: center; }
.badge-disabled { display: inline-block; padding: 4px 8px; background-color: #e9ecef; color: #6c757d; border-radius: 4px; font-size: 12px; }
.actions-cell { white-space: nowrap; }
.actions-cell .btn { margin-right: 4px; }
.warning-row { background-color: #fff3e0; }
.expired-row { background-color: #ffe0e0; }
.disabled-row { background-color: #f0f0f0; color: #999; opacity: 0.7; }
</style>