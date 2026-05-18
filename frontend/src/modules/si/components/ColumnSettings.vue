<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">Настройка отображаемых колонок</div>
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
        <button class="btn btn-secondary" @click="resetToDefault">Сбросить</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

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
  { key: 'notes', label: 'Примечание' },
]

const visible = ref(false)
const localVisibility = reactive<Record<string, boolean>>({})
const editableOrder = ref<typeof allColumns>([])

function loadSettings() {
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

  const savedOrder = localStorage.getItem(STORAGE_ORDER_KEY)
  if (savedOrder) {
    const orderKeys: string[] = JSON.parse(savedOrder)
    editableOrder.value = orderKeys
      .map((key) => allColumns.find((c) => c.key === key))
      .filter((c): c is (typeof allColumns)[0] => c !== undefined)
  } else {
    editableOrder.value = [...allColumns]
  }
}

function save() {
  const orderToSave = editableOrder.value.map((c) => c.key)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(localVisibility))
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
.column-settings-list {
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 15px;
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
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}
</style>
