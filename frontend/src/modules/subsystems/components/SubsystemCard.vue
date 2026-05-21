<template>
  <section class="card subsystem-card">
    <div v-if="isLoading" class="subsystem-state">Загрузка...</div>

    <div v-else-if="error" class="subsystem-state subsystem-error">{{ error }}</div>

    <template v-else-if="subsystem">
      <header class="subsystem-card-header">
        <div>
          <h2>{{ subsystem.name }}</h2>
          <p>{{ subsystem.location }}</p>
        </div>
        <div class="action-buttons">
          <button class="btn btn-secondary" type="button" @click="openEditForm">Редактировать</button>
          <button class="btn btn-danger" type="button" @click="confirmDelete">Удалить</button>
        </div>
      </header>

      <div class="info-grid subsystem-info">
        <div class="info-row">
          <div class="info-label">ID</div>
          <div class="info-value mono">{{ subsystem.subsys_id }}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Наименование</div>
          <div class="info-value">{{ subsystem.name }}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Расположение</div>
          <div class="info-value">{{ subsystem.location || '-' }}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Родитель</div>
          <div class="info-value">{{ parentName }}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Примечание</div>
          <div class="info-value">{{ subsystem.note || '-' }}</div>
        </div>
      </div>

      <section class="subsystem-nodes">
        <header>
          <h3>Узлы подсистемы</h3>
          <span>{{ nodes.length }}</span>
        </header>

        <div v-if="nodes.length === 0" class="subsystem-state compact">Нет привязанных узлов</div>

        <div v-else class="table-scroll-container subsystem-table">
          <table class="data-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Вид</th>
                <th>Производитель</th>
                <th>Модель</th>
                <th>Зав. №</th>
                <th>Инв. №</th>
                <th>Состояние</th>
                <th>Тип</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="node in nodes" :key="node.node_id">
                <td>{{ node.name || '-' }}</td>
                <td>{{ node.node_type_name || '-' }}</td>
                <td>{{ node.manufacturer || '-' }}</td>
                <td>{{ node.model || '-' }}</td>
                <td>{{ node.serial_number || '-' }}</td>
                <td>{{ node.inventory_number || '-' }}</td>
                <td>{{ node.status || '-' }}</td>
                <td>{{ node.is_aggregate ? 'Агрегат' : 'Блок' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <SubsystemForm ref="formRef" @saved="refreshAfterSave" />
      <ConfirmDialog ref="confirmDialog" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useSubsystemStore } from '../stores/subsystemsStore';
import SubsystemForm from './SubsystemForm.vue';
import type { Subsystem, SubsystemNode } from '../types/subsystemsTypes';

const props = defineProps<{ id: string }>();
const emit = defineEmits<{ (event: 'deleted'): void }>();

const store = useSubsystemStore();
const subsystem = ref<Subsystem | null>(null);
const nodes = ref<SubsystemNode[]>([]);
const isLoading = ref(false);
const error = ref('');
const formRef = ref<InstanceType<typeof SubsystemForm> | null>(null);
const confirmDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null);

const parentName = computed(() => {
  if (!subsystem.value?.parent_id) return '-';
  const parent = store.subsystems.find((item) => item.subsys_id === subsystem.value?.parent_id);
  return parent?.name || '-';
});

async function loadData() {
  if (!props.id) return;

  isLoading.value = true;
  error.value = '';

  try {
    await store.fetchAll();
    const [subsystemData, subsystemNodes] = await Promise.all([
      store.getSubsystem(props.id),
      store.fetchNodes(props.id),
    ]);

    subsystem.value = subsystemData;
    nodes.value = subsystemNodes;
  } catch (err: any) {
    subsystem.value = null;
    nodes.value = [];
    error.value = err.message || 'Не удалось загрузить подсистему';
  } finally {
    isLoading.value = false;
  }
}

function openEditForm() {
  if (subsystem.value) {
    formRef.value?.open(subsystem.value);
  }
}

async function refreshAfterSave(saved: Subsystem) {
  subsystem.value = saved;
  nodes.value = await store.fetchNodes(saved.subsys_id);
}

async function confirmDelete() {
  if (!subsystem.value) return;

  const ok = await confirmDialog.value?.show(
    'Удаление подсистемы',
    `Удалить подсистему "${subsystem.value.name}"?`
  );

  if (!ok) return;

  try {
    await store.remove(subsystem.value.subsys_id);
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

.subsystem-nodes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subsystem-nodes header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.subsystem-nodes h3 {
  color: #263746;
  font-size: 17px;
}

.subsystem-nodes span {
  min-width: 32px;
  border-radius: 999px;
  padding: 3px 10px;
  background: #e8f1ec;
  color: #236244;
  text-align: center;
  font-weight: 600;
}

.subsystem-table {
  max-height: 380px;
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

@media (max-width: 760px) {
  .subsystem-card-header {
    flex-direction: column;
  }

  .info-row {
    grid-template-columns: 1fr;
  }
}
</style>
