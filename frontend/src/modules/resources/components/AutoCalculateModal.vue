<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">Автоматический расчёт ресурсов</div>
      <div class="form-group">
        <label>Режим работы узла (часов в год)</label>
        <select v-model="workHours" class="form-control">
          <option value="8760">24/7 (8760 часов/год)</option>
          <option value="6240">Безостановочный (6240 часов/год)</option>
          <option value="4160">Две смены (4160 часов/год)</option>
          <option value="2080">Одна смена (2080 часов/год)</option>
          <option value="custom">Свой вариант</option>
        </select>
      </div>
      <div v-if="workHours === 'custom'" class="form-group">
        <label>Введите значение</label>
        <input type="number" v-model="customHours" class="form-control" />
      </div>
      <div class="form-group">
        <label>Ресурсы для расчёта</label>
        <div v-for="res in resources" :key="res.resource_id" class="checkbox-item">
          <label>
            <input type="checkbox" v-model="selectedResources" :value="res.resource_id" />
            {{ res.name }} ({{ res.node_name }})
          </label>
        </div>
      </div>
      <div v-if="error" class="error-text">{{ error }}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="calculate">Рассчитать</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';

const store = useResourcesStore();
const visible = ref(false);
const workHours = ref('8760');
const customHours = ref(8760);
const selectedResources = ref<string[]>([]);
const error = ref('');

const resources = computed(() => store.resources);

const emit = defineEmits(['calculated']);

function open() {
  selectedResources.value = resources.value.map(r => r.resource_id);
  visible.value = true;
}
function close() { visible.value = false; }

async function calculate() {
  let hours = parseInt(workHours.value);
  if (workHours.value === 'custom') hours = customHours.value;
  
  if (isNaN(hours) || hours <= 0) {
    error.value = 'Введите корректное значение часов';
    return;
  }
  
  let calculated = 0;
  for (const res of resources.value) {
    if (selectedResources.value.includes(res.resource_id)) {
      try {
        // Вызываем API расчёта (не обновляет автоматически, только возвращает результат)
        const result = await store.calculateResource(res.resource_id, hours);
        if (result && result.calculated_resource_percent !== undefined) {
          calculated++;
          // Можно показать уведомление о результате
          console.log(`Ресурс ${res.name}: рассчитанный процент = ${result.calculated_resource_percent}`);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  
  close();
  emit('calculated', { count: calculated });
  window.dispatchEvent(new Event('resource-saved'));
}

defineExpose({ open });
</script>

<style scoped>
.checkbox-item {
  margin: 8px 0;
}
</style>