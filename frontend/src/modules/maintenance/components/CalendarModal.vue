<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">
        Календарь мероприятий
        <button class="btn-close" @click="handleClose">×</button>
      </div>

      <!-- Заголовок с годом -->
      <div class="calendar-year-header" v-if="hasMultipleYears">
        <button class="btn-year" @click="handlePrevYear" :disabled="!canGoPrevYear">←</button>
        <h2>{{ currentYear }} год</h2>
        <button class="btn-year" @click="handleNextYear" :disabled="!canGoNextYear">→</button>
      </div>
      <div v-else class="calendar-year-header">
        <h2>{{ currentYear }} год</h2>
      </div>

      <!-- Прокручиваемая область с календарями -->
      <div class="calendar-scrollable">
        <div class="calendar-grid">
          <div v-for="(monthDays, idx) in monthsData" :key="idx" class="month-card">
            <div class="month-title">{{ monthNames[idx] }}</div>
            <div class="weekdays">
              <span v-for="day in weekDays" :key="day" class="weekday">{{ day }}</span>
            </div>
            <div class="days-grid">
              <div
                v-for="day in monthDays"
                :key="day.date"
                class="day-cell"
                :class="{
                  'other-month': !day.isCurrentMonth,
                  'has-events': day.events && day.events.length > 0,
                  'selected-day': selectedDate === day.date
                }"
                @click="handleSelectDay(day)"
              >
                <div class="day-number">{{ day.day }}</div>
                <div class="day-events">
                  <div 
                    v-if="day.events && day.events.length === 1"
                    class="event-dot"
                    :style="{ backgroundColor: getEventColor(day.events[0].type) }"
                    :title="getEventTitle(day.events[0])"
                  ></div>
                  <div 
                    v-else-if="day.events && day.events.length > 1"
                    class="event-multi"
                    :style="{ background: getMultiColorGradient(day.events) }"
                    :title="`${day.events.length} мероприятия: ${day.events.map((e: any) => e.type).join(', ')}`"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Закрепленная сводка внизу с возможностью сворачивания -->
      <div class="summary-fixed">
        <div class="summary-header" @click="toggleSummary">
          <button class="btn-toggle">{{ summaryCollapsed ? '▼' : '▲' }}</button>
        </div>
        <div v-if="!summaryCollapsed">
          <div v-if="selectedDateEvents.length > 0" class="summary-panel">
            <div class="summary-date">{{ selectedDate ? formatDateFull(selectedDate) : '' }}</div>
            <div class="summary-list-scrollable">
              <div class="summary-list">
                <div v-for="(event, idx) in selectedDateEvents" :key="idx" class="summary-item">
                  <div class="summary-color" :style="{ backgroundColor: getEventColor(event.type) }"></div>
                  <div class="summary-content">
                    <div class="summary-title">
                      <strong>{{ event.nodeName }}</strong>
                      <span class="summary-status" :class="getStatusClass(event.status)">
                        {{ getStatusText(event.status) }}
                      </span>
                    </div>
                    <div class="summary-details">
                      <span>Тип: {{ event.type }}</span>
                      <span v-if="event.completed_date">Дата выполнения: {{ formatDate(event.completed_date) }}</span>
                    </div>
                    <div v-if="event.notes" class="summary-notes">{{ event.notes }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="selectedDate" class="summary-panel empty">
            <p>Нет мероприятий на эту дату</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  tasks: any[];
  planYear?: number;
}>();

const visible = ref(false);
const currentYear = ref(new Date().getFullYear());
const selectedDate = ref<string | null>(null);
const summaryCollapsed = ref(false);

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Цвета для типов ТО
const eventColors: Record<string, string> = {
  'плановое ТО': '#2c5f8a',
  'внеплановое ТО': '#e67e22',
  'капитальный ремонт': '#27ae60',
  'текущий ремонт': '#3498db',
  'аварийный ремонт': '#c0392b',
  'модернизация': '#8e44ad'
};

// Статусы
const statusText: Record<string, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  completed: 'Выполнено',
  not_completed: 'Не выполнено'
};

function getEventColor(type: string): string {
  return eventColors[type] || '#999';
}

function getMultiColorGradient(events: any[]): string {
  const colors = events.slice(0, 4).map(e => getEventColor(e.type));
  
  if (colors.length === 2) {
    return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  } else if (colors.length === 3) {
    return `conic-gradient(${colors[0]} 0deg 120deg, ${colors[1]} 120deg 240deg, ${colors[2]} 240deg 360deg)`;
  } else if (colors.length >= 4) {
    // Радужный градиент
    return 'radial-gradient(circle at 30% 30%, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)';
  }
  return getEventColor(events[0].type);
}

function getStatusText(status: string): string {
  return statusText[status] || status;
}

function getStatusClass(status: string): string {
  if (status === 'completed') return 'status-completed';
  if (status === 'in_progress') return 'status-progress';
  if (status === 'pending') return 'status-pending';
  return 'status-not-completed';
}

function getEventTitle(event: any): string {
  return `${event.type}: ${event.nodeName} - ${getStatusText(event.status)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const dayName = days[date.getDay()];
  return `${formatDate(dateStr)} (${dayName})`;
}

function getDaysInMonth(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startWeekday = firstDay.getDay() || 7;
  const daysInMonth = lastDay.getDate();
  
  const days: any[] = [];
  
  // Дни предыдущего месяца
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startWeekday - 1; i > 0; i--) {
    const date = new Date(year, monthIndex - 1, prevMonthLastDay - i + 1);
    days.push({
      date: date.toISOString().split('T')[0],
      day: date.getDate(),
      isCurrentMonth: false,
      events: []
    });
  }
  
  // Дни текущего месяца
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, monthIndex, i);
    const dateStr = date.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      day: i,
      isCurrentMonth: true,
      events: []
    });
  }
  
  // Дни следующего месяца
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, monthIndex + 1, i);
    days.push({
      date: date.toISOString().split('T')[0],
      day: date.getDate(),
      isCurrentMonth: false,
      events: []
    });
  }
  
  return days;
}

// Заполнение событий по датам
const eventsByDate = computed(() => {
  const map = new Map<string, any[]>();
  
  for (const task of props.tasks) {
    const date = task.completed_date || task.expiry_date;
    if (date) {
      const normalizedDate = date.split('T')[0];
      if (!map.has(normalizedDate)) {
        map.set(normalizedDate, []);
      }
      map.get(normalizedDate)!.push({
        date: normalizedDate,
        nodeName: task.node_name,
        type: task.service_type,
        status: task.status_name,
        completed_date: task.completed_date,
        notes: task.notes
      });
    }
  }
  
  return map;
});

// Генерация календаря
const monthsData = computed(() => {
  const result = [];
  for (let month = 0; month < 12; month++) {
    const days = getDaysInMonth(currentYear.value, month);
    for (const day of days) {
      day.events = eventsByDate.value.get(day.date) || [];
    }
    result.push(days);
  }
  return result;
});

// События на выбранную дату
const selectedDateEvents = computed(() => {
  if (!selectedDate.value) return [];
  return eventsByDate.value.get(selectedDate.value) || [];
});

// Вычисляем минимальный и максимальный год по задачам
const yearRange = computed(() => {
  let min = Infinity;
  let max = -Infinity;
  
  for (const task of props.tasks) {
    const date = task.completed_date || task.expiry_date;
    if (date) {
      const year = new Date(date).getFullYear();
      if (year < min) min = year;
      if (year > max) max = year;
    }
  }
  
  if (min === Infinity) {
    min = props.planYear || new Date().getFullYear();
    max = props.planYear || new Date().getFullYear();
  }
  
  return { min, max };
});

const hasMultipleYears = computed(() => {
  return yearRange.value.min !== yearRange.value.max;
});

const canGoPrevYear = computed(() => {
  return currentYear.value > yearRange.value.min;
});

const canGoNextYear = computed(() => {
  return currentYear.value < yearRange.value.max;
});

function toggleSummary() {
  summaryCollapsed.value = !summaryCollapsed.value;
}

function handlePrevYear() {
  if (canGoPrevYear.value) {
    currentYear.value--;
    selectedDate.value = null;
  }
}

function handleNextYear() {
  if (canGoNextYear.value) {
    currentYear.value++;
    selectedDate.value = null;
  }
}

function handleSelectDay(day: any) {
  selectedDate.value = day.date;
  summaryCollapsed.value = false; // Автоматически разворачиваем при выборе даты
}

function handleClose() {
  visible.value = false;
}

function open() {
  if (props.planYear) {
    currentYear.value = props.planYear;
  } else if (yearRange.value.min !== Infinity) {
    currentYear.value = yearRange.value.min;
  } else {
    currentYear.value = new Date().getFullYear();
  }
  selectedDate.value = null;
  summaryCollapsed.value = false;
  visible.value = true;
}

defineExpose({ open });
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 1200px;
  max-width: 95%;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

/* Прокручиваемая область с календарями */
.calendar-scrollable {
  flex: 1;
  overflow-y: auto;
  max-height: calc(90vh - 300px);
  margin-bottom: 16px;
}

/* Закрепленная сводка внизу */
.summary-fixed {
  flex-shrink: 0;
  border-top: 1px solid #e0e4e8;
  background: white;
  margin-top: 8px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 8px 0;
  cursor: pointer;
  user-select: none;
}

.summary-header h4 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
}

.btn-toggle {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #2c5f8a;
  padding: 4px 8px;
}

.summary-date {
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
  border-left: 3px solid #2c5f8a;
  padding-left: 10px;
  font-size: 14px;
}

.summary-list-scrollable {
  max-height: 100px;
  overflow-y: auto;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-panel {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e4e8;
  margin-top: 4px;
}

.summary-panel.empty {
  text-align: center;
  color: #6c757d;
  padding: 20px;
}

.summary-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e0e4e8;
}

.summary-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.summary-content {
  flex: 1;
}

.summary-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}

.summary-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
}

.status-pending {
  background-color: #fff3e0;
  color: #e67e22;
}

.status-progress {
  background-color: #e8f0fe;
  color: #2c5f8a;
}

.status-completed {
  background-color: #e8f5e9;
  color: #27ae60;
}

.status-not-completed {
  background-color: #ffebee;
  color: #c0392b;
}

.summary-details {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6c757d;
  flex-wrap: wrap;
}

.summary-notes {
  margin-top: 6px;
  font-size: 12px;
  color: #2c3e50;
  font-style: italic;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e4e8;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.calendar-year-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.calendar-year-header h2 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.btn-year {
  background: #e9ecef;
  border: none;
  font-size: 20px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.btn-year:hover:not(:disabled) {
  background: #dee2e6;
}

.btn-year:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.month-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #e0e4e8;
}

.month-title {
  text-align: center;
  font-weight: 600;
  padding: 8px;
  color: #2c5f8a;
  margin-bottom: 8px;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 11px;
  color: #6c757d;
  margin-bottom: 4px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.day-cell {
  aspect-ratio: 1;
  padding: 4px;
  text-align: center;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  position: relative;
}

.day-cell:hover {
  background-color: #e8f0fe;
}

.day-cell.other-month {
  color: #ccc;
}

.day-cell.has-events {
  background-color: #e8f0fe;
}

.day-cell.selected-day {
  background-color: #2c5f8a;
  color: white;
}

.day-number {
  font-size: 12px;
  font-weight: 500;
}

.day-events {
  display: flex;
  justify-content: center;
  margin-top: 2px;
}

.event-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.event-multi {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.modal-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary {
  background-color: #e9ecef;
  color: #2c3e50;
  border: 1px solid #ced4da;
}

.btn-secondary:hover {
  background-color: #dee2e6;
}
</style>