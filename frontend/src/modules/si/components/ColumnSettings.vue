<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">
        <span>Настройка отображаемых колонок</span>
        <button class="btn-close" @click="close" title="Закрыть">×</button>
      </div>

      <div class="column-settings-list">
        <div
          v-for="(col, index) in editableOrder"
          :key="col.key"
          class="column-item"
          draggable="true"
          @dragstart="dragStart(index, $event)"
          @dragover="dragOver($event)"
          @drop="drop(index, $event)"
        >
          <label class="checkbox-label">
            <input type="checkbox" v-model="localVisibility[col.key]" />
            <span>{{ col.label }}</span>
          </label>
          <button class="drag-handle" title="Перетащить для изменения порядка">⋮⋮</button>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-left">
          <button class="btn btn-secondary" @click="toggleSelectAll">
            {{ allSelected ? 'Убрать всё' : 'Выбрать всё' }}
          </button>
          <button class="btn btn-secondary" @click="resetToDefault">Сбросить</button>
        </div>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const STORAGE_KEY = 'si_column_visibility'
const STORAGE_ORDER_KEY = 'si_column_order'

const allColumns = [
  { key: 'name', label: 'Наименование' },
  { key: 'manufacturer', label: 'Производитель' },
  { key: 'model', label: 'Марка' },
  { key: 'serialNumber', label: 'Зав. №' },
  { key: 'inventoryNumber', label: 'Инв. №' },
  { key: 'tabNumber', label: 'Таб. №' },
  { key: 'status', label: 'Статус' },
  { key: 'lastVerificationDate', label: 'Дата поверки' },
  { key: 'nextVerificationDate', label: 'Следующая поверка' },
  { key: 'verificationInterval', label: 'Межповерочный интервал' },
  { key: 'location', label: 'Размещение' },
  { key: 'note', label: 'Примечание' },
]

const visible = ref(false)
const localVisibility = reactive<Record<string, boolean>>({})
const editableOrder = ref<typeof allColumns>([])

// Проверка, выбраны ли все колонки
const allSelected = computed(() => {
  return editableOrder.value.every(col => localVisibility[col.key] === true)
})

function toggleSelectAll() {
  const newValue = !allSelected.value
  for (const col of editableOrder.value) {
    localVisibility[col.key] = newValue
  }
}

function loadSettings() {
  // Загружаем видимость
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    for (const col of allColumns) {
      localVisibility[col.key] = parsed[col.key] !== undefined ? parsed[col.key] : true
    }
  } else {
    for (const col of allColumns) {
      localVisibility[col.key] = true
    }
  }

  // Загружаем порядок
  const savedOrder = localStorage.getItem(STORAGE_ORDER_KEY)
  if (savedOrder) {
    const orderKeys = JSON.parse(savedOrder)
    editableOrder.value = orderKeys
      .map((key: string) => allColumns.find(c => c.key === key))
      .filter(Boolean)
  } else {
    editableOrder.value = [...allColumns]
  }
}

function save() {
  const visibilityToSave: Record<string, boolean> = {}
  for (const col of allColumns) {
    visibilityToSave[col.key] = localVisibility[col.key] ?? true
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visibilityToSave))
  
  const orderToSave = editableOrder.value.map(c => c.key)
  localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(orderToSave))
  
  visible.value = false
  window.dispatchEvent(new Event('column-settings-changed'))
}

function resetToDefault() {
  for (const col of allColumns) {
    localVisibility[col.key] = true
  }
  editableOrder.value = [...allColumns]
  save()
}

function open() {
  loadSettings()
  visible.value = true
}

function close() {
  visible.value = false
}

let draggedIndex: number | null = null

function dragStart(index: number, event: DragEvent) {
  draggedIndex = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function dragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function drop(targetIndex: number, event: DragEvent) {
  event.preventDefault()
  if (draggedIndex !== null && draggedIndex !== targetIndex) {
    const items = [...editableOrder.value]
    const removed = items.splice(draggedIndex, 1)[0]
    if (removed) {
      items.splice(targetIndex, 0, removed)
      editableOrder.value = items
    }
  }
  draggedIndex = null
}

defineExpose({ open })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e4e8;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-close:hover {
  background-color: #e9ecef;
  color: #333;
}

.column-settings-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px 20px;
}

.column-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin: 4px 0;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: move;
}
.column-item:hover {
  background: #e9ecef;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  flex: 1;
}
.drag-handle {
  background: none;
  border: none;
  cursor: grab;
  font-size: 18px;
  color: #6c757d;
  padding: 0 8px;
}
.drag-handle:active {
  cursor: grabbing;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #e0e4e8;
}

.footer-left {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #2c5f8a;
  color: white;
}

.btn-primary:hover {
  background-color: #1e4566;
}

.btn-secondary {
  background-color: #e9ecef;
  color: #2c3e50;
  border: 1px solid #ced4da;
}

.btn-secondary:hover {
  background-color: #dee2e6;
}
</style>