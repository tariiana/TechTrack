<template>
  <div v-if="visible" class="modal-overlay">
    <form class="modal-content attach-modal" @submit.prevent="save">
      <div class="modal-header">Добавление в подсистему</div>

      <div class="form-row">
        <div class="form-group type-group">
          <label for="content-type">Модуль</label>
          <select id="content-type" v-model="selectedType" class="form-control">
            <option value="all">Все</option>
            <option value="equipment">Оборудование</option>
            <option value="instrument">СИ</option>
            <option value="resource">Ресурсы</option>
            <option value="maintenance">Обслуживание</option>
            <option value="plan">Планы ТО</option>
          </select>
        </div>

        <div class="form-group search-group">
          <label for="content-search">Название</label>
          <input
            id="content-search"
            v-model="query"
            class="form-control"
            type="text"
            autocomplete="off"
            placeholder="Начните вводить название"
          />
        </div>
      </div>

      <div class="search-results">
        <button
          v-for="item in results"
          :key="`${item.type}-${item.id}`"
          class="result-row"
          :class="{ selected: isSelected(item), disabled: isDisabled(item) }"
          type="button"
          :disabled="isDisabled(item)"
          @click="selectItem(item)"
        >
          <span class="result-type">{{ typeLabel(item.type) }}</span>
          <span class="result-main">
            <strong>{{ item.title || item.name || 'Без названия' }}</strong>
            <small>{{ item.subtitle || item.current_subsystem_name || ' ' }}</small>
          </span>
          <span v-if="item.current_subsystem_name" class="result-subsystem">
            {{ item.current_subsystem_name }}
          </span>
        </button>

        <div v-if="isSearching" class="result-empty">Поиск...</div>
        <div v-else-if="results.length === 0" class="result-empty">Нет результатов</div>
      </div>

      <div v-if="error" class="error-text form-error">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" @click="close">Отмена</button>
        <button class="btn btn-primary" type="submit" :disabled="!selectedItem || isSaving">
          {{ isSaving ? 'Добавление...' : 'Добавить' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import type { SubsystemContentItem, SubsystemContentType } from '../types/subsystemsTypes';

const store = useSubsystemStore();
const visible = ref(false);
const subsystemId = ref('');
const query = ref('');
const selectedType = ref<SubsystemContentType | 'all'>('all');
const selectedItem = ref<SubsystemContentItem | null>(null);
const results = ref<SubsystemContentItem[]>([]);
const isSearching = ref(false);
const isSaving = ref(false);
const error = ref('');
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const emit = defineEmits<{ (event: 'saved'): void }>();

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    equipment: 'Оборудование',
    instrument: 'СИ',
    resource: 'Ресурс',
    maintenance: 'ТО',
    plan: 'План',
  };
  return labels[type] || type;
}

function isSelected(item: SubsystemContentItem) {
  return selectedItem.value?.id === item.id && selectedItem.value?.type === item.type;
}

function isDisabled(item: SubsystemContentItem) {
  return item.attachable === false || item.current_subsystem_id === subsystemId.value;
}

function selectItem(item: SubsystemContentItem) {
  if (!isDisabled(item)) selectedItem.value = item;
}

async function runSearch() {
  isSearching.value = true;
  error.value = '';

  try {
    results.value = await store.searchContent(query.value.trim(), selectedType.value);
    selectedItem.value = null;
  } catch (err: any) {
    results.value = [];
    error.value = err.message || 'Не удалось выполнить поиск';
  } finally {
    isSearching.value = false;
  }
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 250);
}

function open(id: string) {
  subsystemId.value = id;
  visible.value = true;
  query.value = '';
  selectedType.value = 'all';
  selectedItem.value = null;
  error.value = '';
  runSearch();
}

function close() {
  visible.value = false;
}

async function save() {
  if (!selectedItem.value) return;

  try {
    isSaving.value = true;
    await store.attachContent(subsystemId.value, selectedItem.value.type, selectedItem.value.id);
    close();
    emit('saved');
  } catch (err: any) {
    error.value = err.message || 'Не удалось добавить объект';
  } finally {
    isSaving.value = false;
  }
}

watch([query, selectedType], scheduleSearch);

defineExpose({ open });
</script>

<style scoped>
.attach-modal {
  width: min(760px, 94vw);
}

.type-group {
  flex: 0 0 190px;
}

.search-group {
  flex: 1;
}

.search-results {
  max-height: 360px;
  overflow: auto;
  border: 1px solid #dfe5eb;
  border-radius: 8px;
}

.result-row {
  width: 100%;
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 180px;
  gap: 12px;
  align-items: center;
  border: 0;
  border-bottom: 1px solid #edf1f5;
  padding: 10px 12px;
  background: #fff;
  color: #263746;
  text-align: left;
  cursor: pointer;
}

.result-row:last-child {
  border-bottom: 0;
}

.result-row:hover,
.result-row.selected {
  background: #edf5fb;
}

.result-row.disabled {
  cursor: default;
  opacity: 0.55;
}

.result-type {
  color: #4a6378;
  font-weight: 600;
}

.result-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-main strong,
.result-main small,
.result-subsystem {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-main small,
.result-subsystem {
  color: #697887;
}

.result-empty {
  padding: 14px;
  color: #697887;
}

.form-error {
  margin-top: 10px;
}

@media (max-width: 760px) {
  .result-row {
    grid-template-columns: 1fr;
  }
}
</style>
