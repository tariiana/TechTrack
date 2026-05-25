<template>
  <section class="card subsystem-card">
    <div v-if="isLoading" class="subsystem-state">Загрузка...</div>

    <div v-else-if="error" class="subsystem-state subsystem-error">{{ error }}</div>

    <template v-else-if="content">
      <SubsystemContentDetail
        v-if="selectedItem"
        :item="selectedItem"
        @back="selectedItem = null"
        @move="openMoveModal"
      />

      <template v-else>
        <header class="subsystem-card-header">
          <div>
            <h2>{{ content.subsystem.name }}</h2>
            <p>{{ content.subsystem.location }}</p>
          </div>
          <div class="action-buttons">
            <button class="btn btn-primary" type="button" @click="openAttachModal">Добавить содержимое</button>
            <button class="btn btn-secondary" type="button" @click="openEditForm">Редактировать</button>
            <button class="btn btn-danger" type="button" @click="confirmDelete">Удалить</button>
          </div>
        </header>

        <div class="summary-grid">
          <div class="summary-item">
            <strong>{{ content.counts.equipment }}</strong>
            <span>Оборудование</span>
          </div>
          <div class="summary-item">
            <strong>{{ content.counts.instruments }}</strong>
            <span>СИ</span>
          </div>
          <div class="summary-item">
            <strong>{{ content.counts.resources }}</strong>
            <span>Ресурсы</span>
          </div>
          <div class="summary-item">
            <strong>{{ content.counts.maintenance }}</strong>
            <span>ТО</span>
          </div>
          <div class="summary-item">
            <strong>{{ content.counts.plans }}</strong>
            <span>Планы</span>
          </div>
        </div>

        <div class="info-grid subsystem-info">
          <div class="info-row">
            <div class="info-label">ID</div>
            <div class="info-value mono">{{ content.subsystem.subsys_id }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Родитель</div>
            <div class="info-value">{{ parentName }}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Примечание</div>
            <div class="info-value">{{ content.subsystem.note || '-' }}</div>
          </div>
        </div>

        <div class="content-tabs" role="tablist" aria-label="Содержимое подсистемы">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="content-tab"
            :class="{ active: activeTab === tab.key }"
            type="button"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span>{{ groupItems(tab.key).length }}</span>
          </button>
        </div>

        <section class="content-list">
          <header>
            <h3>{{ activeTabLabel }}</h3>
          </header>

          <div v-if="activeItems.length === 0" class="subsystem-state compact">
            Нет объектов
          </div>

          <div v-else class="table-scroll-container subsystem-table">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Описание</th>
                  <th>Подсистема</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in activeItems"
                  :key="`${item.type}-${item.id}`"
                  class="clickable-row"
                  @click="selectedItem = item"
                >
                  <td>{{ item.title || item.name || 'Без названия' }}</td>
                  <td>{{ item.subtitle || item.node_type_name || item.model || '-' }}</td>
                  <td>{{ item.subsystem_name || content.subsystem.name }}</td>
                  <td>{{ item.status || item.instrument_status || item.status_name || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <SubsystemForm ref="formRef" @saved="refreshAfterSubsystemSave" />
      <SubsystemAttachContentModal ref="attachModalRef" @saved="refreshContent" />
      <SubsystemMoveContentModal ref="moveModalRef" @saved="handleMoved" />
      <ConfirmDialog ref="confirmDialog" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import SubsystemAttachContentModal from './SubsystemAttachContentModal.vue';
import SubsystemContentDetail from './SubsystemContentDetail.vue';
import SubsystemForm from './SubsystemForm.vue';
import SubsystemMoveContentModal from './SubsystemMoveContentModal.vue';
import type {
  Subsystem,
  SubsystemContent,
  SubsystemContentItem,
  SubsystemContentType,
} from '../types/subsystemsTypes';

const props = defineProps<{ id: string }>();
const emit = defineEmits<{ (event: 'deleted'): void }>();

const store = useSubsystemStore();
const content = ref<SubsystemContent | null>(null);
const selectedItem = ref<SubsystemContentItem | null>(null);
const activeTab = ref<SubsystemContentType>('equipment');
const isLoading = ref(false);
const error = ref('');
const formRef = ref<InstanceType<typeof SubsystemForm> | null>(null);
const attachModalRef = ref<InstanceType<typeof SubsystemAttachContentModal> | null>(null);
const moveModalRef = ref<InstanceType<typeof SubsystemMoveContentModal> | null>(null);
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);

const tabs: Array<{ key: SubsystemContentType; label: string }> = [
  { key: 'equipment', label: 'Оборудование' },
  { key: 'instrument', label: 'СИ' },
  { key: 'resource', label: 'Ресурсы' },
  { key: 'maintenance', label: 'ТО' },
  { key: 'plan', label: 'Планы ТО' },
];

const parentName = computed(() => {
  if (!content.value?.subsystem.parent_id) return '-';
  const parent = store.subsystems.find((item) => item.subsys_id === content.value?.subsystem.parent_id);
  return parent?.name || '-';
});

const activeItems = computed(() => groupItems(activeTab.value));
const activeTabLabel = computed(() => tabs.find((tab) => tab.key === activeTab.value)?.label || '');

function groupItems(type: SubsystemContentType) {
  if (!content.value) return [];
  if (type === 'instrument') return content.value.instruments;
  if (type === 'resource') return content.value.resources;
  if (type === 'maintenance') return content.value.maintenance;
  if (type === 'plan') return content.value.plans;
  return content.value.equipment;
}

async function loadData() {
  if (!props.id) return;

  isLoading.value = true;
  error.value = '';
  selectedItem.value = null;

  try {
    await store.fetchAll();
    content.value = await store.fetchContent(props.id);
  } catch (err: any) {
    content.value = null;
    error.value = err.message || 'Не удалось загрузить подсистему';
  } finally {
    isLoading.value = false;
  }
}

function openEditForm() {
  if (content.value?.subsystem) {
    formRef.value?.open(content.value.subsystem);
  }
}

function openAttachModal() {
  attachModalRef.value?.open(props.id);
}

function openMoveModal(item: SubsystemContentItem) {
  moveModalRef.value?.open(item, props.id);
}

async function refreshContent() {
  content.value = await store.fetchContent(props.id);
  await Promise.all([store.fetchTree(true), store.fetchAll(true)]);
}

async function refreshAfterSubsystemSave(saved: Subsystem) {
  await refreshContent();
  if (content.value) content.value.subsystem = saved;
}

async function handleMoved() {
  selectedItem.value = null;
  await refreshContent();
}

async function confirmDelete() {
  if (!content.value?.subsystem) return;

  const ok = await confirmDialog.value?.show(
    'Удаление подсистемы',
    `Удалить подсистему "${content.value.subsystem.name}"?`
  );

  if (!ok) return;

  try {
    await store.remove(content.value.subsystem.subsys_id);
    emit('deleted');
  } catch (err: any) {
    error.value = err.message || 'Не удалось удалить подсистему';
  }
}

watch(() => props.id, loadData);
onMounted(loadData);
</script>

<style scoped>
.subsystem-card {
  gap: 18px;
}

.subsystem-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.subsystem-card-header h2 {
  color: #263746;
  font-size: 22px;
  line-height: 1.2;
}

.subsystem-card-header p {
  margin-top: 6px;
  color: #5b6773;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.summary-item {
  min-width: 0;
  border: 1px solid #dfe5eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.summary-item strong {
  display: block;
  color: #204968;
  font-size: 22px;
  line-height: 1.1;
}

.summary-item span {
  display: block;
  margin-top: 4px;
  color: #607384;
  font-size: 12px;
}

.subsystem-info {
  display: grid;
  gap: 0;
  overflow: hidden;
  border: 1px solid #e0e5eb;
  border-radius: 8px;
}

.info-row {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
  border-bottom: 1px solid #e0e5eb;
}

.info-row:last-child {
  border-bottom: 0;
}

.info-label,
.info-value {
  min-width: 0;
  padding: 10px 12px;
}

.info-label {
  background: #f7f9fb;
  color: #384b5c;
  font-weight: 600;
}

.info-value {
  overflow-wrap: anywhere;
  color: #263746;
}

.mono {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
}

.content-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.content-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #d8e0e8;
  border-radius: 6px;
  padding: 8px 12px;
  background: #fff;
  color: #263746;
  cursor: pointer;
}

.content-tab.active {
  border-color: #7ca7c7;
  background: #eaf3f9;
  color: #173b57;
  font-weight: 600;
}

.content-tab span {
  min-width: 22px;
  border-radius: 999px;
  padding: 2px 7px;
  background: #edf1f5;
  color: #526575;
  text-align: center;
  font-size: 12px;
}

.content-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-list h3 {
  color: #263746;
  font-size: 17px;
}

.subsystem-table {
  max-height: 430px;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: #edf5fb;
}

.subsystem-state {
  padding: 18px;
  color: #5b6773;
}

.subsystem-state.compact {
  border: 1px solid #e0e5eb;
  border-radius: 8px;
  background: #f7f9fb;
}

.subsystem-error {
  color: #9f2f24;
}

@media (max-width: 920px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .subsystem-card-header {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .summary-grid,
  .info-row {
    grid-template-columns: 1fr;
  }
}
</style>
