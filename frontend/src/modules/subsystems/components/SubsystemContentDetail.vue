<template>
  <section class="content-detail">
    <header class="detail-header">
      <button class="btn btn-secondary btn-sm" type="button" @click="$emit('back')">Назад</button>
      <div class="detail-title">
        <span class="detail-type">{{ typeLabel(item.type) }}</span>
        <h2>{{ item.title || item.name || 'Без названия' }}</h2>
      </div>
      <div v-if="canMove" class="action-buttons">
        <button class="btn btn-secondary" type="button" @click="$emit('move', item)">Переместить</button>
      </div>
    </header>

    <template v-if="item.type === 'instrument'">
      <h3>Средство измерения</h3>
      <div class="module-grid four-col">
        <InfoCell label="Тип" :value="display(item.node_type_name)" />
        <InfoCell label="Марка" :value="display(item.model)" />
        <InfoCell label="Производитель" :value="display(item.manufacturer)" />
        <InfoCell label="Заводской номер" :value="display(item.serial_number)" />
        <InfoCell label="Узел" :value="display(item.name)" />
        <InfoCell label="Статус" :value="display(item.instrument_status)" />
        <InfoCell label="Размещение" :value="display(item.location)" />
        <InfoCell label="Табельный номер" :value="display(item.tab_number)" />
        <InfoCell label="Последняя поверка" :value="display(formatDate(item.last_calibration_date))" />
        <InfoCell label="Следующая поверка" :value="display(formatDate(item.next_calibration_date))" />
        <InfoCell label="Межповерочный интервал" :value="intervalText" />
        <InfoCell label="Поверитель" :value="display(item.calibrator)" />
      </div>
    </template>

    <template v-else-if="item.type === 'resource'">
      <h3>Ресурс</h3>
      <div class="module-grid four-col">
        <InfoCell label="Наименование" :value="display(item.title || item.node_name)" />
        <InfoCell label="Марка" :value="display(resourceParam('mark') || item.model)" />
        <InfoCell label="Тип" :value="resourceParam('type')" />
        <InfoCell label="Узел" :value="display(item.node_name)" />
        <InfoCell label="Производитель" :value="display(item.manufacturer)" />
        <InfoCell label="Дата регистрации" :value="display(formatDate(item.registration_date))" />
        <InfoCell label="Расположение" :value="display(item.location)" />
        <InfoCell label="Примечание" :value="display(item.note)" />
      </div>

      <section class="subsection">
        <h3>Параметры</h3>
        <div v-if="resourceParams.length" class="table-scroll-container compact-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>Параметр</th>
                <th>Значение</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="param in resourceParams" :key="param.name">
                <td>{{ param.name }}</td>
                <td>{{ param.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-block">Нет параметров</div>
      </section>
    </template>

    <template v-else-if="item.type === 'maintenance'">
      <h3>Техническое обслуживание</h3>
      <div class="plan-info">
        <p><strong>Вид ТО:</strong> {{ item.service_type || item.title || '-' }}</p>
        <p><strong>Узел:</strong> {{ item.node_name || item.subtitle || '-' }}</p>
        <p><strong>План:</strong> {{ item.plan_name || '-' }}</p>
      </div>

      <div class="table-scroll-container compact-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>Узел</th>
              <th>Местоположение</th>
              <th>Дата проведения ТО</th>
              <th>Вид обслуживания</th>
              <th>Статус</th>
              <th>Примечание</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ item.node_name || '-' }}</td>
              <td>{{ item.node_location || '-' }}</td>
              <td>{{ formatDate(item.completed_date) || '-' }}</td>
              <td>{{ item.service_type || '-' }}</td>
              <td>{{ item.status_name || '-' }}</td>
              <td>{{ item.notes || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else-if="item.type === 'plan'">
      <h3>{{ item.title || item.name || 'План ТО' }}</h3>
      <div class="plan-info">
        <p><strong>Период:</strong> {{ formatDate(item.start_date) }} — {{ item.end_date ? formatDate(item.end_date) : '∞' }}</p>
        <p><strong>Задач в выбранной подсистеме:</strong> {{ item.subsystem_tasks_count || 0 }}</p>
      </div>

      <div class="module-grid two-col">
        <InfoCell label="Дата создания" :value="display(formatDate(item.created_at))" />
        <InfoCell label="Дата обновления" :value="display(formatDate(item.updated_at))" />
      </div>
    </template>

    <template v-else>
      <div class="equipment-layout">
        <div class="equipment-col">
          <InfoLine label="Марка" :value="display(item.model)" />
          <InfoLine label="Наименование" :value="display(item.title || item.name)" />
          <InfoLine label="Подсистема" :value="display(item.subsystem_name || item.current_subsystem_name)" />
          <InfoLine label="Производитель" :value="display(item.manufacturer)" />
          <InfoLine label="Состояние" :value="display(item.status)" />
          <InfoLine label="Заводской номер" :value="display(item.serial_number)" />
          <InfoLine label="Учётный номер" :value="display(item.registration_number)" />
        </div>
        <div class="equipment-col">
          <InfoLine label="Тип" :value="item.is_aggregate ? 'Агрегат' : 'Блок'" />
          <InfoLine label="Вид" :value="display(item.node_type_name)" />
          <InfoLine label="Размещение" :value="display(item.location)" />
          <InfoLine label="Инвентарный номер" :value="display(item.inventory_number)" />
          <InfoLine label="Агрегат" :value="item.is_aggregate ? 'да' : 'нет'" />
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, type PropType } from 'vue';
import type { SubsystemContentItem } from '../types/subsystemsTypes';

const props = defineProps<{ item: SubsystemContentItem }>();
defineEmits<{
  (event: 'back'): void;
  (event: 'move', item: SubsystemContentItem): void;
}>();

const canMove = computed(() => props.item.type !== 'plan');

const InfoCell = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: null as unknown as PropType<unknown>, default: '' },
  },
  setup(cellProps) {
    return () => h('div', { class: 'detail-pair' }, [
      h('div', { class: 'detail-label' }, cellProps.label),
      h('div', { class: 'detail-value' }, normalizeValue(cellProps.value)),
    ]);
  },
});

const InfoLine = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: null as unknown as PropType<unknown>, default: '' },
  },
  setup(lineProps) {
    return () => h('div', { class: 'equipment-row' }, [
      h('strong', lineProps.label),
      h('span', normalizeValue(lineProps.value)),
    ]);
  },
});

function normalizeValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function display(value: unknown) {
  return normalizeValue(value);
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    equipment: 'Оборудование',
    instrument: 'Средство измерения',
    resource: 'Ресурс',
    maintenance: 'ТО',
    plan: 'План ТО',
  };
  return labels[type] || type;
}

function formatDate(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('ru-RU');
}

function resourceParam(key: string) {
  const params = props.item.resource_params;
  if (!params || typeof params !== 'object' || Array.isArray(params)) return '';
  const value = (params as Record<string, unknown>)[key];
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    return normalizeValue((value as { value: unknown }).value);
  }
  return normalizeValue(value);
}

const intervalText = computed(() => {
  const interval = props.item.calibration_interval;
  return interval ? `${interval} год(а)` : '';
});

const resourceParams = computed(() => {
  const params = props.item.resource_params;
  if (!params || typeof params !== 'object' || Array.isArray(params)) return [];

  return Object.entries(params as Record<string, unknown>).map(([name, raw]) => {
    let value = raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw) {
      value = (raw as { value: unknown }).value;
    }

    return { name, value: normalizeValue(value) };
  });
});
</script>

<style scoped>
.content-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.detail-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
}

.detail-title {
  min-width: 0;
}

.detail-type {
  display: inline-block;
  margin-bottom: 4px;
  color: #5c7286;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.detail-header h2,
.content-detail h3 {
  color: #263746;
}

.detail-header h2 {
  font-size: 22px;
  line-height: 1.25;
}

.content-detail h3 {
  font-size: 18px;
}

.module-grid {
  display: grid;
  gap: 0;
  overflow: hidden;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  background: #f8f9fa;
}

.module-grid.four-col {
  grid-template-columns: 180px 1fr 180px 1fr;
}

.module-grid.two-col {
  grid-template-columns: 180px 1fr;
}

:deep(.detail-pair) {
  display: contents;
}

:deep(.detail-label),
:deep(.detail-value) {
  min-width: 0;
  border-bottom: 1px solid #e0e4e8;
  padding: 10px 12px;
  font-size: 13px;
}

:deep(.detail-label) {
  color: #2c3e50;
  font-weight: 600;
}

:deep(.detail-value) {
  overflow-wrap: anywhere;
  color: #1a2a3a;
}

.equipment-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  border-radius: 8px;
  padding: 16px;
  background: #f8fafc;
}

.equipment-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.equipment-row) {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}

:deep(.equipment-row strong) {
  flex: 0 0 165px;
  color: #2c3e50;
}

:deep(.equipment-row span) {
  min-width: 0;
  overflow-wrap: anywhere;
  color: #1a2a3a;
  text-align: right;
}

.plan-info {
  border-radius: 8px;
  padding: 12px;
  background: #f8f9fa;
}

.plan-info p {
  margin: 4px 0;
}

.subsection {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compact-table {
  max-height: 320px;
}

.empty-block {
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  padding: 14px;
  background: #f8f9fa;
  color: #667789;
}

@media (max-width: 920px) {
  .detail-header,
  .equipment-layout {
    grid-template-columns: 1fr;
  }

  .module-grid.four-col,
  .module-grid.two-col {
    grid-template-columns: 160px minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .module-grid.four-col,
  .module-grid.two-col {
    grid-template-columns: 1fr;
  }

  :deep(.equipment-row) {
    flex-direction: column;
  }

  :deep(.equipment-row span) {
    text-align: left;
  }
}
</style>
