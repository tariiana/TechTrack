<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 600px;">
      <div class="modal-header">Расширенный фильтр</div>
      <div v-for="(cond, idx) in conditions" :key="idx" class="filter-row">
        <select v-model="cond.field">
          <option value="name">Наименование</option>
          <option value="type">Тип</option>
          <option value="location">Местоположение</option>
          <option value="createdAt">Дата создания</option>
          <option value="updatedAt">Дата обновления</option>
        </select>
        <select v-model="cond.operator">
          <option value="eq">Равно</option>
          <option value="contains">Содержит</option>
          <option value="gt">Больше</option>
          <option value="lt">Меньше</option>
        </select>
        <input v-model="cond.value" type="text" placeholder="Значение" class="form-control" />
        <button @click="removeCondition(idx)" class="btn-sm btn-danger">✖</button>
      </div>
      <button class="btn-sm btn-secondary" @click="addCondition">+ Добавить условие</button>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="apply">Применить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
const conditions = ref<{ field: string; operator: string; value: string }[]>([]);

const emit = defineEmits(['apply']);

function open() {
  visible.value = true;
}
function close() { visible.value = false; }
function addCondition() {
  conditions.value.push({ field: 'name', operator: 'contains', value: '' });
}
function removeCondition(idx: number) {
  conditions.value.splice(idx, 1);
}
function apply() {
  emit('apply', conditions.value);
  close();
}
defineExpose({ open });
</script>

<style scoped>
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
.filter-row select, .filter-row input {
  flex: 1;
}
</style>