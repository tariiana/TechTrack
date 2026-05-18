<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 550px;">
      <div class="modal-header">{{ isEdit ? 'Редактирование плана' : 'Создание плана ТО' }}</div>
      
      <div class="form-group">
        <label>Название плана</label>
        <input v-model="form.name" class="form-control" />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Дата начала*</label>
          <input type="date" v-model="form.startDate" class="form-control" :class="{ 'invalid-date': dateError }" @change="validateDates" />
        </div>
        <div class="form-group">
          <label>Дата окончания*</label>
          <input type="date" v-model="form.endDate" class="form-control" :class="{ 'invalid-date': dateError }" @change="validateDates" />
        </div>
      </div>
      
      <div v-if="dateError" class="error-text">{{ dateError }}</div>
      
      <div class="form-group">
        <label>Описание</label>
        <textarea v-model="form.description" rows="2" class="form-control"></textarea>
      </div>
      
      <div v-if="generating" class="auto-message generating">
        🔄 Анализ оборудования и формирование плана...
      </div>
      <div v-if="autoMessage" class="auto-message success">
        ✅ {{ autoMessage }}
      </div>
      
      <div v-if="error" class="error-text">{{ error }}</div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save" :disabled="generating || !!dateError">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useMaintenanceStore } from '../stores/maintenanceStore';

const store = useMaintenanceStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const error = ref('');
const autoMessage = ref('');
const generating = ref(false);
const dateError = ref('');

const form = reactive({
  name: '',
  startDate: '',
  endDate: '',
  description: '',
});

function validateDates() {
  if (!form.startDate || !form.endDate) {
    dateError.value = '';
    return;
  }
  const start = new Date(form.startDate);
  const end = new Date(form.endDate);
  if (end < start) {
    dateError.value = '❌ Дата окончания не может быть раньше даты начала!';
  } else {
    dateError.value = '';
  }
}

watch([() => form.startDate, () => form.endDate], () => {
  validateDates();
});

function open(plan?: any) {
  reset();
  if (plan) {
    isEdit.value = true;
    editId.value = plan.plan_id;
    form.name = plan.name;
    form.startDate = plan.start_date;
    form.endDate = plan.end_date || '';
    form.description = plan.description || '';
  }
  visible.value = true;
}

function reset() {
  form.name = '';
  form.startDate = '';
  form.endDate = '';
  form.description = '';
  error.value = '';
  dateError.value = '';
  autoMessage.value = '';
  generating.value = false;
  isEdit.value = false;
  editId.value = null;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!form.startDate || !form.endDate) {
    error.value = 'Укажите дату начала и окончания плана';
    return;
  }
  const start = new Date(form.startDate);
  const end = new Date(form.endDate);
  if (end < start) {
    dateError.value = 'Дата окончания не может быть раньше даты начала!';
    return;
  }
  
  generating.value = true;
  autoMessage.value = '';
  error.value = '';
  
  try {
    if (isEdit.value && editId.value) {
      await store.updatePlan(editId.value, {
        name: form.name,
        start_date: form.startDate,
        end_date: form.endDate,
      });
      autoMessage.value = 'План обновлён';
    } else {
      const planData = {
        name: form.name || `План ТО на ${new Date(form.startDate).getFullYear()} год`,
        start_date: form.startDate,
        end_date: form.endDate,
      };
      // Создаём план через store.createPlan
      const newPlan = await store.createPlan(planData);
      // Если нужно автоматически сгенерировать задачи, вызываем store.generatePlan
      if (newPlan && newPlan.plan_id) {
        await store.generatePlan(form.startDate, form.endDate);
        autoMessage.value = `План создан! Задачи сгенерированы автоматически.`;
      } else {
        autoMessage.value = 'План создан.';
      }
    }
    setTimeout(() => close(), 1500);
  } catch (err: any) {
    console.error('Ошибка сохранения плана:', err);
    error.value = err.message || 'Ошибка при сохранении плана';
  } finally {
    generating.value = false;
  }
}

defineExpose({ open });
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 15px;
  margin-bottom: 15px;
}
.form-row .form-group {
  flex: 1;
}
.auto-message {
  margin: 12px 0;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
}
.auto-message.generating {
  background-color: #e3f2fd;
  color: #1976d2;
}
.auto-message.success {
  background-color: #e8f5e9;
  color: #2e7d32;
}
.invalid-date {
  border-color: #c0392b !important;
  background-color: #ffe0e0;
}
.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
}
</style>