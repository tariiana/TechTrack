<template>
  <div class="modal-overlay" v-if="visible" @click.self="close">
    <div class="modal-content" style="width: 600px">
      <div class="modal-header">Расширенный фильтр</div>
      <div class="filter-conditions">
        <div v-for="(cond, idx) in conditions" :key="idx" class="filter-row">
          <select v-model="cond.field" class="form-control">
            <option value="">-- Поле --</option>
            <option v-for="col in filterableFields" :key="col.key" :value="col.key">{{ col.label }}</option>
          </select>
          <select v-model="cond.operator" class="form-control">
            <option value="contains">Содержит</option>
            <option value="equals">Равно</option>
            <option value="greater">Больше</option>
            <option value="less">Меньше</option>
          </select>
          <input v-model="cond.value" type="text" class="form-control" placeholder="Значение" />
          <button class="btn-icon" @click="removeCondition(idx)">🗑️</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="addCondition">+ Добавить условие</button>
        <button class="btn btn-secondary" @click="resetConditions">Сбросить</button>
        <button class="btn btn-primary" @click="apply">Применить</button>
        <button class="btn btn-secondary" @click="close">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'apply', conditions: any[]): void;
}>();

const visible = ref(false);
const conditions = ref<{ field: string; operator: string; value: string }[]>([]);

const filterableFields = [
  { key: 'name', label: 'Наименование' },
  { key: 'manufacturer', label: 'Производитель' },
  { key: 'model', label: 'Марка' },
  { key: 'serial_number', label: 'Зав. №' },
  { key: 'inventory_number', label: 'Инв. №' },
  { key: 'status', label: 'Состояние' },
  { key: 'location', label: 'Размещение' },
  { key: 'subsystem_name', label: 'Подсистема' },
  { key: 'parent_name', label: 'Установлено в' },
];

function addCondition() {
  conditions.value.push({ field: '', operator: 'contains', value: '' });
}

function removeCondition(idx: number) {
  conditions.value.splice(idx, 1);
}

function resetConditions() {
  conditions.value = [];
}

function apply() {
  const validConditions = conditions.value.filter(c => c.field && c.value);
  emit('apply', validConditions);
  visible.value = false;
}

function open() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

defineExpose({ open });
</script>
<style scoped>
/* Локальные стили только для .filter-conditions и .filter-row, .btn-icon */
.filter-conditions {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}
.filter-row .form-control {
  flex: 1;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
}
</style>
