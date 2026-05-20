<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Оборудование</h2>
      <div class="action-buttons">
        <button v-if="canEdit" class="btn btn-primary btn-fixed" @click="openForm">+ Добавить</button>
        <button class="btn btn-secondary btn-fixed" @click="showColumnSettings = true">⚙️ Колонки</button>
        <button class="btn btn-secondary btn-fixed" @click="exportToExcel">📎 Экспорт</button>
        <button class="btn btn-secondary btn-fixed" @click="openAdvancedFilter">🔍 Расш. фильтр</button>
      </div>
    </div>

    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px">
      <input
        v-model="quickSearch"
        type="text"
        placeholder="Поиск по наименованию, производителю, марке..."
        class="form-control"
        style="width: 250px"
        @input="applyQuickFilter"
      />
      <select v-model="quickStatus" class="form-control" style="width: 150px" @change="applyQuickFilter">
        <option value="">Все статусы</option>
        <option value="получен">Получен</option>
        <option value="исправен">Исправен</option>
        <option value="неисправен">Неисправен</option>
        <option value="в ремонте">В ремонте</option>
        <option value="на поверке">На поверке</option>
        <option value="законсервирован">Законсервирован</option>
        <option value="списан">Списан</option>
      </select>
      <button class="btn btn-secondary" @click="resetFilters">Сбросить</button>
    </div>

    <!-- Активные фильтры (чипсы) -->
    <div class="active-filters" v-if="hasActiveFilters">
      <span class="filter-label">Активные фильтры:</span>
      <div class="filter-tags">
        <span v-if="quickSearch" class="filter-tag">
          Поиск: "{{ quickSearch }}"
          <button class="filter-remove" @click="quickSearch = ''; applyQuickFilter()">✖</button>
        </span>
        <span v-if="quickStatus" class="filter-tag">
          Статус: {{ getStatusLabel(quickStatus) }}
          <button class="filter-remove" @click="quickStatus = ''; applyQuickFilter()">✖</button>
        </span>
        <span v-for="(cond, idx) in advancedConditions" :key="idx" class="filter-tag">
          {{ getFieldLabel(cond.field) }} {{ getOperatorLabel(cond.operator) }} "{{ cond.value }}"
          <button class="filter-remove" @click="removeAdvancedCondition(idx)">✖</button>
        </span>
        <button class="btn-reset-filters" @click="resetFilters">Сбросить все</button>
      </div>
    </div>

    <div v-if="store.loading" class="loading">Загрузка...</div>

    <!-- Таблица с прокруткой (используем компонент ScrollableTable) -->
    <ScrollableTable>
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="col in visibleColumns" :key="col.key" @click="sortBy(col.key)">
              {{ col.label }}
              <span v-if="sortField === col.key">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
            </th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in sortedNodes" :key="node.node_id" :class="getRowClass(node)" :title="getTooltip(node)">
            <td v-for="col in visibleColumns" :key="col.key">{{ formatCellValue(node, col.key) }}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-secondary" @click="viewCard(node.node_id)">Просмотр</button>
              <button
                v-if="canEdit && node.status !== 'списан'"
                class="btn btn-sm btn-secondary"
                @click="editNode(node.node_id)"
              >✏️</button>
              <button
                v-if="canEdit && node.status !== 'списан'"
                class="btn btn-sm btn-danger"
                @click="deleteNode(node.node_id)"
              >📝 Списать</button>
              <span v-if="node.status === 'списан'" class="badge-disabled">Списан</span>
            </td>
          </tr>
          <tr v-if="!store.loading && sortedNodes.length === 0">
            <td :colspan="visibleColumns.length + 1" class="empty">Нет данных</td>
          </tr>
        </tbody>
      </table>
    </ScrollableTable>

    <!-- Модальное окно настройки колонок (с drag-and-drop) -->
    <div class="modal-overlay" v-if="showColumnSettings" @click.self="showColumnSettings = false">
      <div class="modal-content" style="width: 500px;">
        <div class="modal-header">Настройка колонок</div>
        <div class="column-list">
          <div
            v-for="(colKey, idx) in columnOrder"
            :key="colKey"
            class="column-item"
            draggable="true"
            @dragstart="onDragStart($event, idx)"
            @dragend="onDragEnd"
            @dragover.prevent
            @drop="onDrop($event, idx)"
          >
            <label>
              <input type="checkbox" :value="colKey" v-model="selectedColumns" @change="saveColumnSettings" />
              {{ getColumnLabel(colKey) }}
            </label>
            <div class="drag-handle">⋮⋮</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="resetColumnSettings">Сбросить</button>
          <button class="btn btn-secondary" @click="showColumnSettings = false">Закрыть</button>
        </div>
      </div>
    </div>

    <!-- Модальные окна компонентов -->
    <EquipmentForm
      :visible="showFormModal"
      :nodeId="editingNodeId"
      @update:visible="showFormModal = $event"
      @saved="refresh"
    />
    <ConfirmDialog ref="confirmDialog" />
    <AdvancedFilter ref="advancedFilterRef" @apply="applyAdvancedFilters" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import EquipmentForm from './EquipmentForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import AdvancedFilter from './AdvancedFilter.vue';
import ScrollableTable from '@/components/common/ScrollableTable.vue';
import * as exportUtils from '@/utils/exportUtils';

onMounted(() => {
  document.body.classList.add('equipment-page-scroll');
});

onUnmounted(() => {
  document.body.classList.remove('equipment-page-scroll');
});
const router = useRouter();
const store = useEquipmentStore();

// Состояния формы
const showFormModal = ref(false);
const editingNodeId = ref<string | null>(null);
const confirmDialog = ref();
const advancedFilterRef = ref();

// Фильтры и сортировка
const quickSearch = ref('');
const quickStatus = ref('');
const advancedConditions = ref<any[]>([]);
const sortField = ref('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

// Настройка колонок
const showColumnSettings = ref(false);
const allColumns = [
  { key: 'subsystem_name', label: 'Подсистема' },
  { key: 'name', label: 'Наименование' },
  { key: 'parent_name', label: 'Установлено в' },
  { key: 'manufacturer', label: 'Производитель' },
  { key: 'model', label: 'Марка' },
  { key: 'parameters', label: 'Параметры' },
  { key: 'serial_number', label: 'Зав. №' },
  { key: 'inventory_number', label: 'Инв. №' },
  { key: 'is_si', label: 'СИ' },
  { key: 'status', label: 'Состояние' },
  { key: 'location', label: 'Размещение' },
  { key: 'note', label: 'Примечание' },
];
const allColumnKeys = allColumns.map(c => c.key);
const columnOrder = ref<string[]>([...allColumnKeys]);
const selectedColumns = ref<string[]>([...allColumnKeys]);

// Drag-and-drop для колонок
let dragStartIndex = ref<number | null>(null);
function onDragStart(event: DragEvent, index: number) {
  dragStartIndex.value = index;
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}
function onDragEnd() { dragStartIndex.value = null; }
function onDrop(event: DragEvent, dropIndex: number) {
  const startIdx = dragStartIndex.value;
  if (startIdx === null || startIdx === dropIndex) return;
  const newOrder = [...columnOrder.value];
  const removed = newOrder[startIdx];
  if (!removed) return;
  newOrder.splice(startIdx, 1);
  newOrder.splice(dropIndex, 0, removed);
  columnOrder.value = newOrder;
  saveColumnSettings();
  dragStartIndex.value = null;
}

// Computed – видимые колонки
const visibleColumns = computed(() => {
  return columnOrder.value
    .filter(key => selectedColumns.value.includes(key))
    .map(key => allColumns.find(c => c.key === key)!);
});

// Права доступа
const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  try {
    const role = JSON.parse(user).role;
    return role === 'operator' || role === 'admin';
  } catch { return false; }
});

// Вспомогательные функции для отображения фильтров
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    получен: 'Получен',
    исправен: 'Исправен',
    неисправен: 'Неисправен',
    'в ремонте': 'В ремонте',
    'на поверке': 'На поверке',
    законсервирован: 'Законсервирован',
    списан: 'Списан',
  };
  return labels[status] || status;
}
function getFieldLabel(field: string): string {
  return allColumns.find(c => c.key === field)?.label || field;
}
function getOperatorLabel(op: string): string {
  const map: Record<string, string> = { contains: 'содержит', equals: 'равно', greater: 'больше', less: 'меньше' };
  return map[op] || op;
}
function removeAdvancedCondition(idx: number) { advancedConditions.value.splice(idx, 1); }
const hasActiveFilters = computed(() => !!(quickSearch.value || quickStatus.value || advancedConditions.value.length));

// Форматирование ячейки
function formatCellValue(node: any, key: string): string {
  if (key === 'is_si') return node.is_si ? 'Да' : 'Нет';
  if (key === 'parameters') {
    if (!node.parameters) return '-';
    return typeof node.parameters === 'object' ? JSON.stringify(node.parameters) : node.parameters;
  }
  const val = node[key];
  return val !== undefined && val !== null && val !== '' ? String(val) : '-';
}

// Сортировка с помещением списанных в конец
const sortedNodes = computed(() => {
  let list = [...store.nodes];
  // Расширенные фильтры
  if (advancedConditions.value.length) {
    list = list.filter(node => {
      return advancedConditions.value.every(cond => {
        let val = (node as any)[cond.field] ?? '';
        const strVal = String(val).toLowerCase();
        const condVal = String(cond.value).toLowerCase();
        switch (cond.operator) {
          case 'equals': return strVal === condVal;
          case 'contains': return strVal.includes(condVal);
          case 'greater': return Number(val) > Number(cond.value);
          case 'less': return Number(val) < Number(cond.value);
          default: return true;
        }
      });
    });
  }
  // Сортировка: списанные в конец, затем по выбранному полю
  list.sort((a, b) => {
    const aOff = a.status === 'списан';
    const bOff = b.status === 'списан';
    if (aOff !== bOff) return aOff ? 1 : -1;
    let va = (a as any)[sortField.value] ?? '';
    let vb = (b as any)[sortField.value] ?? '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortOrder.value === 'asc' ? -1 : 1;
    if (va > vb) return sortOrder.value === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
});

function sortBy(field: string) {
  if (sortField.value === field) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  else { sortField.value = field; sortOrder.value = 'asc'; }
}
function applyQuickFilter() { store.setFilterParams({ search: quickSearch.value, status: quickStatus.value }); }
function resetFilters() {
  quickSearch.value = '';
  quickStatus.value = '';
  advancedConditions.value = [];
  store.setFilterParams({ search: '', status: '' });
}
function openAdvancedFilter() { advancedFilterRef.value?.open(); }
function applyAdvancedFilters(conditions: any[]) { advancedConditions.value = conditions; }
function viewCard(id: string) { router.push(`/equipment/${id}`); }
function openForm() { editingNodeId.value = null; showFormModal.value = true; }
function editNode(nodeId: string) { editingNodeId.value = nodeId; showFormModal.value = true; }
async function deleteNode(id: string) {
  const ok = await confirmDialog.value?.show('Списание', 'Списать узел?');
  if (ok) await store.deleteNode(id);
}
function refresh() { store.fetchNodes(); }

// Экспорт
function getExportData() {
  return sortedNodes.value.map(node => {
    const row: any = {};
    for (const col of visibleColumns.value) row[col.label] = formatCellValue(node, col.key);
    return row;
  });
}
function exportToExcel() {
  const data = getExportData();
  if (!data.length) { alert('Нет данных для экспорта'); return; }
  const filename = `Оборудование_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}`;
  exportUtils.exportToExcel(data, filename);
}
function exportToWord() {
  const data = getExportData();
  if (!data.length) { alert('Нет данных для экспорта'); return; }
  const headers = Object.keys(data[0]);
  const filename = `Оборудование_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}`;
  exportUtils.exportToWord(data, headers, filename);
}

// Настройка колонок (drag-and-drop + localStorage)
function getColumnLabel(key: string) { return allColumns.find(c => c.key === key)?.label || key; }
function saveColumnSettings() {
  localStorage.setItem('equipment_column_order', JSON.stringify(columnOrder.value));
  localStorage.setItem('equipment_selected_columns', JSON.stringify(selectedColumns.value));
}
function loadColumnSettings() {
  const so = localStorage.getItem('equipment_column_order');
  if (so) try { columnOrder.value = JSON.parse(so); } catch {}
  const ss = localStorage.getItem('equipment_selected_columns');
  if (ss) try { selectedColumns.value = JSON.parse(ss); } catch {}
}
function resetColumnSettings() {
  columnOrder.value = [...allColumnKeys];
  selectedColumns.value = [...allColumnKeys];
  saveColumnSettings();
}

// Дополнительные функции для стилей строк (аналогично SI)
function getDaysUntilStatus(node: any): number {
  // Для оборудования можно вычислить, например, оставшиеся дни до списания или ресурса.
  // Пока возвращаем большое число, чтобы не влиять на сортировку.
  return Infinity;
}
function getRowClass(node: any): string {
  if (node.status === 'списан') return 'disabled-row';
  // Можно добавить предупреждения по типу ресурса (если нужно)
  return '';
}
function getTooltip(node: any): string {
  if (node.status === 'списан') return 'Оборудование списано';
  return '';
}

onMounted(async () => {
  loadColumnSettings();
  await store.init();
});
</script>

<style scoped>
/* Локальные стили только для специфичных элементов */
.action-buttons { display: flex; gap: 10px; }
.btn-fixed { min-width: 140px; text-align: center; }
.badge-disabled { display: inline-block; padding: 4px 8px; background-color: #e9ecef; color: #6c757d; border-radius: 4px; font-size: 12px; }
.actions-cell { white-space: nowrap; }
.actions-cell .btn { margin-right: 4px; }
.empty { text-align: center; padding: 20px; color: #999; }
.loading { text-align: center; padding: 20px; color: #1976d2; font-weight: normal; }

/* Активные фильтры (как в SI) */
.active-filters {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
}
.full-width-table {
  overflow-x: visible;   /* не создаём свою прокрутку */
}
.data-table {
  min-width: max-content;  /* таблица растягивается на всю ширину содержимого */
  width: auto;
  white-space: nowrap;     /* текст в ячейках не переносится */
}
/* Если нужно убрать ограничения у родительских карточек */
.card {
  overflow-x: visible !important;
  max-width: none !important;
}
body.equipment-page-scroll {
  overflow-x: auto !important;
}
.filter-label { font-weight: 500; color: #1e293b; }
.filter-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filter-tag { background: #e2e8f0; padding: 4px 8px; border-radius: 16px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }
.filter-remove { background: none; border: none; cursor: pointer; color: #c0392b; font-weight: bold; font-size: 14px; padding: 0 4px; }
.btn-reset-filters { background: none; border: 1px solid #cbd5e1; border-radius: 16px; padding: 4px 12px; font-size: 12px; cursor: pointer; }
.btn-reset-filters:hover { background: #e2e8f0; }

/* Стили для модального окна настройки колонок */
.modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
.modal-content { background:white; border-radius:8px; width:500px; max-width:90%; }
.modal-header { padding:12px 16px; border-bottom:1px solid #e2e8f0; font-weight:600; }
.modal-footer { padding:10px 16px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:8px; }
.column-list { max-height:400px; overflow-y:auto; padding:8px; }
.column-item { display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-bottom:1px solid #e2e8f0; cursor:grab; }
.drag-handle { color:#94a3b8; font-size:16px; cursor:grab; }
</style>