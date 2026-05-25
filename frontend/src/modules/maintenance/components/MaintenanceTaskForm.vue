<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 550px">
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
          :class="{ 'warning-date': holidayWarning || overdueWarning }"
          @change="checkOverdue"
        />
        <small class="text-muted">Укажите, когда было проведено ТО</small>
        <div v-if="holidayWarning" class="warning-text">
          ⚠️ {{ holidayWarning }}
        </div>
        <div v-if="overdueWarning" class="warning-text overdue-warning">
          {{ overdueWarning }}
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
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { apiFetch } from '@/api/client';

const props = defineProps<{
  tasks?: any[];
}>();

const maintenanceStore = useMaintenanceStore();
const equipmentStore = useEquipmentStore();
const visible = ref(false);
const editId = ref<number | null>(null);
const planId = ref<number | null>(null);
const error = ref('');
const equipmentNodes = ref<any[]>([]);
const holidayWarning = ref('');
const overdueWarning = ref('');
const confirmDialog = ref();
const submitted = ref(false);
const isLoadingExpiry = ref(false);

// Проверка прав доступа
const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

// Переменные для поиска
const searchQuery = ref('');
const showDropdown = ref(false);
const filteredEquipment = ref<any[]>([]);

// Хранилище для актуального срока ТО
const currentExpiryDate = ref<string | null>(null);

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

// Загрузка актуального срока ТО с бэкенда через эндпоинт /nodes/:id/with-expiry
async function fetchNodeExpiryDate(nodeId: number) {
  if (!nodeId) {
    currentExpiryDate.value = null;
    return;
  }
  
  isLoadingExpiry.value = true;
  overdueWarning.value = '';
  
  try {
    // Используем новый эндпоинт с вычисленным expiry_date
    console.log(`Загрузка данных узла ${nodeId} с /nodes/${nodeId}/with-expiry`);
    const response = await apiFetch(`/nodes/${nodeId}/with-expiry`);
    const nodeData = response.data || response;
    
    console.log('Загружены данные узла:', nodeData);
    
    // Получаем expiry_date из ответа
    currentExpiryDate.value = nodeData.expiry_date || null;
    
    if (currentExpiryDate.value) {
      console.log('Актуальный срок ТО:', currentExpiryDate.value);
    } else {
      console.warn('Поле expiry_date не найдено в ответе, ищем альтернативы...');
      // Если нет expiry_date, пробуем использовать commission_date как fallback
      if (nodeData.commission_date) {
        console.log('Используем commission_date как fallback:', nodeData.commission_date);
        currentExpiryDate.value = nodeData.commission_date;
      }
    }
    
    // После загрузки проверяем просрочку
    await checkOverdue();
  } catch (err) {
    console.error('Ошибка загрузки срока ТО:', err);
    
    // Fallback: пробуем обычный эндпоинт /nodes/:id
    try {
      console.log(`Пробуем fallback: /nodes/${nodeId}`);
      const fallbackResponse = await apiFetch(`/nodes/${nodeId}`);
      const fallbackData = fallbackResponse.data || fallbackResponse;
      currentExpiryDate.value = fallbackData.expiry_date || fallbackData.commission_date || null;
      console.log('Fallback данные:', currentExpiryDate.value);
    } catch (fallbackErr) {
      console.error('Fallback также не сработал:', fallbackErr);
      currentExpiryDate.value = null;
    }
  } finally {
    isLoadingExpiry.value = false;
  }
}

async function selectEquipment(node: any) {
  form.node_id = node.node_id;
  searchQuery.value = node.name;
  showDropdown.value = false;
  
  // Загружаем актуальный срок ТО с бэкенда
  await fetchNodeExpiryDate(node.node_id);
}

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
    '01-01': 'Новый год', '01-02': 'Новый год', '01-07': 'Рождество',
    '02-23': 'День защитника Отечества', '03-08': 'Международный женский день',
    '05-01': 'Праздник Весны и Труда', '05-09': 'День Победы',
    '06-12': 'День России', '11-04': 'День народного единства',
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

function getDaysWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return 'дней';
  if (lastDigit === 1) return 'день';
  if (lastDigit >= 2 && lastDigit <= 4) return 'дня';
  return 'дней';
}

function formatDateSimple(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Проверка просрочки на основе актуального срока ТО
 */
async function checkOverdue() {
  // Очищаем предыдущее предупреждение
  overdueWarning.value = '';
  
  // Проверяем наличие всех необходимых данных
  if (!form.completed_date || !form.node_id) {
    console.log('Нет даты или оборудования');
    return;
  }
  
  // Если еще загружается срок ТО, ждем
  if (isLoadingExpiry.value) {
    console.log('Загрузка срока ТО, ждем...');
    return;
  }
  
  // Если срок ТО не загружен, пробуем загрузить
  if (!currentExpiryDate.value) {
    console.log('Срок ТО не загружен, пробуем загрузить...');
    await fetchNodeExpiryDate(form.node_id);
    return;
  }
  
  const completedDate = new Date(form.completed_date);
  const expiryDate = new Date(currentExpiryDate.value);
  
  // Сбрасываем время для корректного сравнения
  completedDate.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  
  console.log('Сравнение дат:', {
    completed: completedDate,
    expiry: expiryDate,
    completedStr: form.completed_date,
    expiryStr: currentExpiryDate.value
  });
  
  if (completedDate > expiryDate) {
    const daysDiff = Math.ceil((completedDate.getTime() - expiryDate.getTime()) / (1000 * 3600 * 24));
    const daysWord = getDaysWord(daysDiff);
    overdueWarning.value = `⚠️ Внимание! Дата проведения ТО на ${daysDiff} ${daysWord} позже истечения срока ТО (${formatDateSimple(currentExpiryDate.value)}). Рекомендуется указать корректную дату.`;
    console.log('Установлено предупреждение:', overdueWarning.value);
  } else {
    console.log('Дата в пределах срока или раньше');
    if (completedDate < expiryDate) {
      const daysRemaining = Math.ceil((expiryDate.getTime() - completedDate.getTime()) / (1000 * 3600 * 24));
      console.log(`До истечения срока осталось ${daysRemaining} дней`);
    }
  }
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

watch(() => form.completed_date, async () => {
  checkDate();
  await checkOverdue();
});

watch(() => form.node_id, async () => {
  // При смене оборудования загружаем актуальный срок
  if (form.node_id) {
    await fetchNodeExpiryDate(form.node_id);
  } else {
    currentExpiryDate.value = null;
    overdueWarning.value = '';
  }
});

function loadEquipment() {
  equipmentStore.fetchNodes();
  equipmentNodes.value = equipmentStore.allNodes || [];
  filteredEquipment.value = equipmentNodes.value;
}

async function open(pId: number, task?: any) {
  // Проверка прав - observer не может открыть форму
  if (!canEdit.value) {
    showToast('Недостаточно прав для выполнения действия', 'error');
    return;
  }
  
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
    const selectedNode = equipmentNodes.value.find(n => n.node_id === task.node_id);
    searchQuery.value = selectedNode?.name || '';
    // Загружаем актуальный срок ТО для оборудования
    if (task.node_id) {
      await fetchNodeExpiryDate(task.node_id);
    }
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
  overdueWarning.value = '';
  currentExpiryDate.value = null;
  editId.value = null;
  planId.value = null;
  searchQuery.value = '';
  showDropdown.value = false;
  submitted.value = false;
  isLoadingExpiry.value = false;
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

  // Проверка на выходной/праздник
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

  // Проверка на просрочку
  if (overdueWarning.value) {
    const confirmed = await confirmDialog.value?.show(
      'Подтверждение',
      `${overdueWarning.value}. Продолжить сохранение?`
    );
    if (!confirmed) return;
  }

  try {
    // Преобразуем node_id в строку (UUID)
    const nodeIdStr = String(form.node_id);
    
    const data = {
      node_id: nodeIdStr,
      service_type: form.service_type,
      status_name: form.status_name,
      completed_date: form.completed_date || null,
      notes: form.notes,
    };

    console.log('=== SENDING DATA ===', data);

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
    console.error('=== ERROR ===', err);
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

.overdue-warning {
  color: #c0392b;
  background-color: #ffebee;
  padding: 6px 10px;
  border-radius: 4px;
  border-left: 3px solid #c0392b;
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