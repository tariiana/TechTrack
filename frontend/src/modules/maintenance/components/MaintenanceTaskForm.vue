<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ editId ? 'Редактирование задачи' : 'Добавление задачи' }}</div>

      <div class="form-group">
        <label>Оборудование*</label>
        <select v-model="form.node_id" class="form-control">
          <option :value="null">-- Выберите --</option>
          <option v-for="node in equipmentNodes" :key="node.node_id" :value="node.node_id">
            {{ node.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Тип обслуживания*</label>
        <select v-model="form.service_type" class="form-control">
          <option value="плановое ТО">Плановое ТО</option>
          <option value="внеплановое ТО">Внеплановое ТО</option>
          <option value="капитальный ремонт">Капитальный ремонт</option>
          <option value="текущий ремонт">Текущий ремонт</option>
          <option value="аварийный ремонт">Аварийный ремонт</option>
          <option value="модернизация">Модернизация</option>
        </select>
      </div>

      <div class="form-group">
        <label>Статус</label>
        <select v-model="form.status_name" class="form-control">
          <option value="pending">Ожидает</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Выполнено</option>
          <option value="not_completed">Не выполнено</option>
        </select>
      </div>

      <div class="form-group">
        <label>Рекомендуемая дата</label>
        <input type="date" v-model="form.recommended_date" class="form-control" />
      </div>

      <div class="form-group">
        <label>Примечание</label>
        <textarea v-model="form.notes" rows="2" class="form-control"></textarea>
      </div>

      <div v-if="error" class="error-text">{{ error }}</div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">Отмена</button>
        <button class="btn btn-primary" @click="save">Сохранить</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';

const maintenanceStore = useMaintenanceStore();
const equipmentStore = useEquipmentStore();
const visible = ref(false);
const editId = ref<number | null>(null);
const planId = ref<number | null>(null);
const error = ref('');
const equipmentNodes = ref<any[]>([]);

const form = reactive({
  node_id: null as number | null,
  service_type: 'плановое ТО',
  status_name: 'pending',
  recommended_date: '',
  notes: '',
});

function loadEquipment() {
  equipmentNodes.value = equipmentStore.nodes || [];
}

function open(pId: number, task?: any) {
  reset();
  loadEquipment();
  planId.value = pId;
  if (task) {
    editId.value = task.maintenance_id;
    form.node_id = task.node_id;
    form.service_type = task.service_type;
    form.status_name = task.status_name;
    form.recommended_date = task.recommended_date || '';
    form.notes = task.notes || '';
  } else {
    // Рекомендуемая дата по умолчанию - через месяц
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 1);
    form.recommended_date = defaultDate.toISOString().split('T')[0];
  }
  visible.value = true;
}

function reset() {
  form.node_id = null;
  form.service_type = 'плановое ТО';
  form.status_name = 'pending';
  form.recommended_date = '';
  form.notes = '';
  error.value = '';
  editId.value = null;
  planId.value = null;
}

function close() {
  visible.value = false;
}

async function save() {
  if (!form.node_id) {
    error.value = 'Выберите оборудование';
    return;
  }
  if (!form.recommended_date) {
    error.value = 'Укажите рекомендуемую дату';
    return;
  }

  try {
    const data = {
      node_id: form.node_id,
      service_type: form.service_type,
      status_name: form.status_name,
      recommended_date: form.recommended_date,
      notes: form.notes,
    };

    if (editId.value) {
      await maintenanceStore.updateTask(editId.value, data);
    } else {
      if (!planId.value) return;
      await maintenanceStore.createTask({ ...data, plan_id: planId.value });
    }
    close();
    window.dispatchEvent(new Event('task-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения задачи';
  }
}

defineExpose({ open });
</script>