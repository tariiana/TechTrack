<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 500px">
      <div class="modal-header">{{ editId ? 'Редактирование мероприятия' : 'Добавление мероприятия' }}</div>

      <!-- Поле выбора оборудования с поиском -->
      <div class="form-group">
        <label>Оборудование*</label>
        <div class="equipment-search">
          <input 
            type="text"
            v-model="searchQuery"
            @input="filterEquipment"
            @focus="showDropdown = true"
            @blur="closeDropdown"
            class="form-control"
            :class="{ 'invalid': !form.node_id && submitted }"
            placeholder="Введите название агрегата для поиска..."
          />
          <div v-if="showDropdown && filteredEquipment.length > 0" class="equipment-dropdown">
            <div 
              v-for="node in filteredEquipment" 
              :key="node.node_id"
              class="equipment-option"
              @click="selectEquipment(node)"
            >
              {{ node.name }}
            </div>
          </div>
        </div>
        <small class="text-muted">Введите название для поиска, затем выберите из списка</small>
        <div v-if="!form.node_id && submitted" class="error-text">Выберите оборудование</div>
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
        <label>Дата проведения ТО</label>
        <input 
          type="date" 
          v-model="form.completed_date" 
          class="form-control" 
          :class="{ 'warning-date': holidayWarning }"
        />
        <small class="text-muted">Укажите, когда было проведено ТО</small>
        <div v-if="holidayWarning" class="warning-text">
          ⚠️ {{ holidayWarning }}
        </div>
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

      <ConfirmDialog ref="confirmDialog" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { showToast } from '@/utils/toast';
import { ref, reactive, onMounted, watch } from 'vue';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';

const maintenanceStore = useMaintenanceStore();
const equipmentStore = useEquipmentStore();
const visible = ref(false);
const editId = ref<number | null>(null);
const planId = ref<number | null>(null);
const error = ref('');
const equipmentNodes = ref<any[]>([]);
const holidayWarning = ref('');
const confirmDialog = ref();
const submitted = ref(false);

// Переменные для поиска
const searchQuery = ref('');
const showDropdown = ref(false);
const filteredEquipment = ref<any[]>([]);

// Функция фильтрации оборудования
function filterEquipment() {
  if (!searchQuery.value.trim()) {
    filteredEquipment.value = equipmentNodes.value;
  } else {
    const query = searchQuery.value.toLowerCase();
    filteredEquipment.value = equipmentNodes.value.filter(node => 
      node.name.toLowerCase().includes(query)
    );
  }
  showDropdown.value = true;
}

// Выбор оборудования из списка
function selectEquipment(node: any) {
  form.node_id = node.node_id;
  searchQuery.value = node.name;
  showDropdown.value = false;
}

// Закрытие выпадающего списка
function closeDropdown() {
  setTimeout(() => {
    showDropdown.value = false;
  }, 200);
}

// Функция проверки, является ли день выходным или праздником
function isWeekendOrHoliday(dateStr: string): { isHoliday: boolean; message: string } {
  if (!dateStr) return { isHoliday: false, message: '' };
  
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === 0) {
    return { isHoliday: true, message: 'Выбранное число - воскресенье (выходной день)' };
  }
  if (dayOfWeek === 6) {
    return { isHoliday: true, message: 'Выбранное число - суббота (выходной день)' };
  }
  
  const holidays: Record<string, string> = {
    '01-01': 'Новый год',
    '01-02': 'Новый год',
    '01-07': 'Рождество',
    '02-23': 'День защитника Отечества',
    '03-08': 'Международный женский день',
    '05-01': 'Праздник Весны и Труда',
    '05-09': 'День Победы',
    '06-12': 'День России',
    '11-04': 'День народного единства',
  };
  
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const key = `${month}-${day}`;
  
  if (holidays[key]) {
    return { isHoliday: true, message: `Выбранное число - ${holidays[key]} (праздничный день)` };
  }
  
  return { isHoliday: false, message: '' };
}

function checkDate() {
  if (!form.completed_date) {
    holidayWarning.value = '';
    return;
  }
  const result = isWeekendOrHoliday(form.completed_date);
  holidayWarning.value = result.message;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const form = reactive({
  node_id: null as number | null,
  service_type: 'плановое ТО',
  status_name: 'pending',
  completed_date: '',
  notes: '',
});

watch(() => form.completed_date, () => {
  checkDate();
});

function loadEquipment() {
  equipmentNodes.value = equipmentStore.nodes || [];
  filteredEquipment.value = equipmentNodes.value;
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
    form.completed_date = task.completed_date || '';
    form.notes = task.notes || '';
    
    // Устанавливаем текст поиска по выбранному оборудованию
    const selectedNode = equipmentNodes.value.find(n => n.node_id === task.node_id);
    searchQuery.value = selectedNode?.name || '';
  } else {
    form.completed_date = formatDate(new Date());
    searchQuery.value = '';
  }
  visible.value = true;
}

function reset() {
  form.node_id = null;
  form.service_type = 'плановое ТО';
  form.status_name = 'pending';
  form.completed_date = '';
  form.notes = '';
  error.value = '';
  holidayWarning.value = '';
  editId.value = null;
  planId.value = null;
  searchQuery.value = '';
  showDropdown.value = false;
  submitted.value = false;
}

function close() {
  visible.value = false;
}

async function save() {
  submitted.value = true;
  
  if (!form.node_id) {
    error.value = 'Выберите оборудование';
    showToast('Выберите оборудование', 'error');
    return;
  }

  if (form.completed_date) {
    const check = isWeekendOrHoliday(form.completed_date);
    if (check.isHoliday) {
      const confirmed = await confirmDialog.value?.show(
        'Подтверждение',
        `${check.message}. Продолжить сохранение?`
      );
      if (!confirmed) return;
    }
  }

  try {
    const data = {
      node_id: form.node_id,
      service_type: form.service_type,
      status_name: form.status_name,
      completed_date: form.completed_date || null,
      notes: form.notes,
    };

    if (editId.value) {
      await maintenanceStore.updateTask(editId.value, data);
      showToast('Мероприятие успешно обновлено', 'success');
    } else {
      if (!planId.value) return;
      await maintenanceStore.createTask({ ...data, plan_id: planId.value });
      showToast('Мероприятие успешно добавлено', 'success');
    }
    close();
    window.dispatchEvent(new Event('task-saved'));
  } catch (err: any) {
    error.value = err.message || 'Ошибка сохранения мероприятия';
    showToast(error.value, 'error');
  }
}

defineExpose({ open });
</script>

<style scoped>
.text-muted {
  font-size: 12px;
  color: #6c757d;
  display: block;
  margin-top: 4px;
}

.warning-date {
  border-color: #e67e22 !important;
  background-color: #fff3e0;
}

.warning-text {
  color: #e67e22;
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-text {
  color: #c0392b;
  font-size: 12px;
  margin-top: 4px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-control.invalid {
  border-color: #c0392b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
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

/* Стили для поиска оборудования */
.equipment-search {
  position: relative;
}

.equipment-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ced4da;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.equipment-option {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.equipment-option:hover {
  background-color: #e8f0fe;
}
</style>