<template>
  <section class="content-detail">
    <template v-if="embeddedComponent && embeddedContentId">
      <header v-if="canMove" class="embedded-action-bar">
        <div>
          <span class="detail-type">{{ typeLabel(item.type) }}</span>
          <h2>{{ item.title || item.name || 'Без названия' }}</h2>
        </div>
        <button class="btn btn-secondary" type="button" @click="$emit('move', item)">
          Переместить в подсистему
        </button>
      </header>

      <component
        :is="embeddedComponent"
        embedded
        :embedded-id="embeddedContentId"
        @back="$emit('back')"
      />
    </template>

    <template v-else>
    <header class="detail-header">
      <button class="btn btn-secondary btn-sm" type="button" @click="$emit('back')">Назад</button>
      <div class="detail-title">
        <span class="detail-type">{{ typeLabel(item.type) }}</span>
        <h2>{{ item.title || item.name || 'Без названия' }}</h2>
      </div>
      <div v-if="canEdit && canMove" class="action-buttons">
        <button class="btn btn-secondary" type="button" @click="$emit('move', item)">Переместить</button>
      </div>
    </header>

    <template v-if="item.type === 'instrument'">
      <h3>Средство измерения</h3>
      <div class="module-grid four-col">
        <div class="detail-pair">
          <div class="detail-label">Тип</div>
          <div class="detail-value">{{ display(item.node_type_name) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Марка</div>
          <div class="detail-value">{{ display(item.model) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Производитель</div>
          <div class="detail-value">{{ display(item.manufacturer) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Заводской номер</div>
          <div class="detail-value">{{ display(item.serial_number) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Узел</div>
          <div class="detail-value">{{ display(item.name) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Статус</div>
          <div class="detail-value">{{ display(item.instrument_status) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Размещение</div>
          <div class="detail-value">{{ display(item.location) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Табельный номер</div>
          <div class="detail-value">{{ display(item.tab_number) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Последняя поверка</div>
          <div class="detail-value">{{ display(formatDate(item.last_calibration_date)) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Следующая поверка</div>
          <div class="detail-value">{{ display(formatDate(item.next_calibration_date)) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Межповерочный интервал</div>
          <div class="detail-value">{{ intervalText }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Поверитель</div>
          <div class="detail-value">{{ display(item.calibrator) }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="item.type === 'resource'">
      <h3>Ресурс</h3>
      <div class="module-grid four-col">
        <div class="detail-pair">
          <div class="detail-label">Наименование</div>
          <div class="detail-value">{{ display(item.title || item.node_name) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Марка</div>
          <div class="detail-value">{{ display(resourceParam('mark') || item.model) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Тип</div>
          <div class="detail-value">{{ resourceParam('type') }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Узел</div>
          <div class="detail-value">{{ display(item.node_name) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Производитель</div>
          <div class="detail-value">{{ display(item.manufacturer) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Дата регистрации</div>
          <div class="detail-value">{{ display(formatDate(item.registration_date)) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Расположение</div>
          <div class="detail-value">{{ display(item.location) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Примечание</div>
          <div class="detail-value">{{ display(item.note) }}</div>
        </div>
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
        <div class="detail-pair">
          <div class="detail-label">Дата создания</div>
          <div class="detail-value">{{ display(formatDate(item.created_at)) }}</div>
        </div>
        <div class="detail-pair">
          <div class="detail-label">Дата обновления</div>
          <div class="detail-value">{{ display(formatDate(item.updated_at)) }}</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="equipment-layout">
        <div class="equipment-col">
          <div class="equipment-row"><strong>Марка</strong><span>{{ display(item.model) }}</span></div>
          <div class="equipment-row"><strong>Наименование</strong><span>{{ display(item.title || item.name) }}</span></div>
          <div class="equipment-row"><strong>Подсистема</strong><span>{{ display(item.subsystem_name || item.current_subsystem_name) }}</span></div>
          <div class="equipment-row"><strong>Производитель</strong><span>{{ display(item.manufacturer) }}</span></div>
          <div class="equipment-row"><strong>Состояние</strong><span>{{ display(item.status) }}</span></div>
          <div class="equipment-row"><strong>Заводской номер</strong><span>{{ display(item.serial_number) }}</span></div>
          <div class="equipment-row"><strong>Учётный номер</strong><span>{{ display(item.registration_number) }}</span></div>
        </div>
        <div class="equipment-col">
          <div class="equipment-row"><strong>Тип</strong><span>{{ item.is_aggregate ? 'Агрегат' : 'Блок' }}</span></div>
          <div class="equipment-row"><strong>Вид</strong><span>{{ display(item.node_type_name) }}</span></div>
          <div class="equipment-row"><strong>Размещение</strong><span>{{ display(item.location) }}</span></div>
          <div class="equipment-row"><strong>Инвентарный номер</strong><span>{{ display(item.inventory_number) }}</span></div>
          <div class="equipment-row"><strong>Агрегат</strong><span>{{ item.is_aggregate ? 'да' : 'нет' }}</span></div>
        </div>
      </div>
    </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { SubsystemContentItem } from '../types/subsystemsTypes';

const EquipmentCardView = defineAsyncComponent(() => import('@/modules/equipment/views/EquipmentCardView.vue'));
const SICardView = defineAsyncComponent(() => import('@/modules/si/views/SICardView.vue'));
const ResourceCard = defineAsyncComponent(() => import('@/modules/resources/components/ResourceCard.vue'));
const MaintenancePlanView = defineAsyncComponent(() => import('@/modules/maintenance/views/MaintenancePlanView.vue'));

const props = defineProps<{
  item: SubsystemContentItem;
  canEdit?: boolean;
}>();

defineEmits<{
  (event: 'back'): void;
  (event: 'move', item: SubsystemContentItem): void;
}>();

const canMove = computed(() => props.item.type !== 'plan' && props.canEdit);

const embeddedComponent = computed(() => {
  if (props.item.type === 'equipment') return EquipmentCardView;
  if (props.item.type === 'instrument') return SICardView;
  if (props.item.type === 'resource') return ResourceCard;
  if (props.item.type === 'plan') return MaintenancePlanView;
  return null;
});

const embeddedContentId = computed(() => {
  const item = props.item as Record<string, unknown>;
  const id = item.type === 'plan'
    ? item.plan_id || item.id
    : item.node_id || item.id;
  return id ? String(id) : '';
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

.embedded-action-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid #e0e5eb;
  border-radius: 8px;
  padding: 12px;
  background: #f7f9fb;
}

.embedded-action-bar h2 {
  color: #263746;
  font-size: 18px;
  line-height: 1.25;
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

.detail-pair {
  display: contents;
}

.detail-pair .detail-label,
.detail-pair .detail-value {
  min-width: 0;
  border-bottom: 1px solid #e0e4e8;
  padding: 10px 12px;
  font-size: 13px;
}

.detail-pair .detail-label {
  color: #2c3e50;
  font-weight: 600;
}

.detail-pair .detail-value {
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

.equipment-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}

.equipment-row strong {
  flex: 0 0 165px;
  color: #2c3e50;
}

.equipment-row span {
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

  .equipment-row {
    flex-direction: column;
  }

  .equipment-row span {
    text-align: left;
  }
}
</style>
