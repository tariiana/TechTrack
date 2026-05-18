<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">{{ isEdit ? 'Редактирование плана' : 'Новый план' }}</div>
      <form @submit.prevent="save">
        <div class="form-group"><label>Название *</label><input v-model="form.name" required /></div>
        <div class="form-row">
          <div class="form-group"><label>Дата начала *</label><input type="date" v-model="form.start_date" required /></div>
          <div class="form-group"><label>Дата окончания</label><input type="date" v-model="form.end_date" /></div>
        </div>
        <div class="form-group"><label>Автоматическая генерация задач</label>
          <label><input type="checkbox" v-model="autoGenerate" /> Да</label>
        </div>
        <div v-if="error" class="error-text">{{ error }}</div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">Отмена</button>
          <button type="submit" class="btn btn-primary">Сохранить</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useMaintenanceStore } from '../stores/maintenanceStore';

const store = useMaintenanceStore();
const visible = ref(false);
const isEdit = ref(false);
const editId = ref<string | null>(null);
const autoGenerate = ref(false);
const error = ref('');

const form = reactive({
  name: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
});

function open(plan?: any) {
  if (plan) {
    isEdit.value = true;
    editId.value = plan.plan_id;
    form.name = plan.name;
    form.start_date = plan.start_date;
    form.end_date = plan.end_date || '';
  } else {
    reset();
  }
  visible.value = true;
}

function reset() {
  isEdit.value = false;
  editId.value = null;
  form.name = '';
  form.start_date = new Date().toISOString().split('T')[0];
  form.end_date = '';
  error.value = '';
}

function close() {
  visible.value = false;
}

async function save() {
  try {
    if (isEdit.value && editId.value) {
      await store.updatePlan(editId.value, { 
        name: form.name, 
        start_date: form.start_date, 
        end_date: form.end_date || null 
      });
    } else {
      const newPlan = await store.createPlan({ 
        name: form.name, 
        start_date: form.start_date, 
        end_date: form.end_date || null 
      });
      if (autoGenerate.value && newPlan && newPlan.plan_id) {
        // Проверяем, что дата начала определена
        if (!form.start_date) {
          error.value = 'Дата начала не указана';
          return;
        }
        const endDate = form.end_date && form.end_date.trim() !== '' ? form.end_date : form.start_date;
        await store.generatePlan(form.start_date, endDate);
      }
    }
    close();
    window.dispatchEvent(new Event('plan-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения плана';
  }
}

defineExpose({ open });
</script>

<style scoped>
.form-row {
  display: flex;
  gap: 15px;
}
.form-row .form-group {
  flex: 1;
}
</style>