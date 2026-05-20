<template>
  <div class="card" v-if="node">
    <!-- Шапка с кнопками (прижаты к правому краю) -->
    <div class="card-header">
      <h2>{{ node.name }}</h2>
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editNode">Редактировать</button>
        <button v-if="canEdit" class="btn btn-danger" @click="deleteNode">Списать</button>
        <button v-if="canEdit" class="btn btn-secondary" @click="openMoveModal">📦 Переместить</button>
      </div>
    </div>

    <!-- Основные сведения (две колонки) -->
    <div class="info-grid">
      <div class="info-col">
        <div class="info-row"><strong>Марка</strong><span>{{ node.model || '-' }}</span></div>
        <div class="info-row"><strong>Наименование</strong><span>{{ node.name }}</span></div>
        <div class="info-row"><strong>Подсистема</strong><span>{{ node.subsystem_name || '-' }}</span></div>
        <div class="info-row"><strong>Производитель</strong><span>{{ node.manufacturer || '-' }}</span></div>
        <div class="info-row"><strong>Дата установки</strong><span>{{ formatDate(node.commission_date) }}</span></div>
        <div class="info-row"><strong>Состояние</strong><span>{{ node.status || '-' }}</span></div>
        <div class="info-row"><strong>Заводской номер</strong><span>{{ node.serial_number || '-' }}</span></div>
        <div class="info-row"><strong>Учётный номер</strong><span>{{ node.registration_number || '-' }}</span></div>
        <div class="info-row"><strong>Режим работы</strong><span>{{ node.operation_mode || '-' }}</span></div>
      </div>
      <div class="info-col">
        <div class="info-row"><strong>Тип</strong><span>{{ node.type === 'aggregate' ? 'Агрегат' : 'Блок' }}</span></div>
        <div class="info-row">
          <strong>Узел</strong>
          <span v-if="node.installed_in_node" class="clickable-link" @click="goToParent">{{ parentName }}</span>
          <span v-else>-</span>
        </div>
        <div class="info-row"><strong>Размещение</strong><span>{{ node.location || '-' }}</span></div>
        <div class="info-row"><strong>Дата производства</strong><span>{{ formatDate(node.manufactured_date) }}</span></div>
        <div class="info-row"><strong>Ресурс</strong><span>-</span></div>
        <div class="info-row"><strong>СИ</strong><span>{{ node.is_si ? 'да' : 'нет' }}</span></div>
        <div class="info-row"><strong>Инвентарный номер</strong><span>{{ node.inventory_number || '-' }}</span></div>
        <div class="info-row"><strong>Агрегат</strong><span>{{ node.type === 'aggregate' ? 'да' : 'нет' }}</span></div>
      </div>
    </div>

    <!-- Параметры -->
    <div class="info-block">
      <h3>Параметры</h3>
      <table class="data-table" v-if="Object.keys(parametersList).length">
        <thead>
          <tr><th>Параметр</th><th>Значение</th><th>Ед. изм.</th><th>Основной</th></tr>
        </thead>
        <tbody>
          <tr v-for="(val, key) in parametersList" :key="key">
            <td>{{ key }}</td>
            <td>{{ val.value }}</td>
            <td>{{ val.unit || '-' }}</td>
            <td>{{ val.isMain ? '✓' : '' }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else>Нет параметров</div>
    </div>

    <!-- Установленные узлы и ресурсы -->
    <div class="section">
      <h3>Установленные узлы и ресурсы</h3>

      <!-- Состав (агрегат) -->
      <div v-if="node.type === 'aggregate'" class="subsection">
        <div class="subsection-header">
          <h4>Состав (дочерние узлы)</h4>
          <button v-if="canEdit" class="btn btn-sm btn-primary" @click="openAddChildModal">+ Добавить в состав</button>
        </div>
        <div class="table-wrapper" v-if="children.length">
          <table class="data-table">
            <thead>
              <tr>
                <th>Наименование</th><th>Тип</th><th>Производитель</th><th>Марка</th>
                <th>Основные параметры</th><th>Примечания</th><th v-if="canEdit">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="child in children" :key="child.node_id">
                <td>
                  <span class="clickable-link" @click="viewChild(child.node_id)">{{ child.name }}</span>
                </td>
                <td>{{ child.type === 'aggregate' ? 'Агрегат' : 'Блок' }}</td>
                <td>{{ child.manufacturer || '-' }}</td>
                <td>{{ child.model || '-' }}</td>
                <td>{{ getMainParamsShort(child) }}</td>
                <td>{{ child.note || '-' }}</td>
                <td v-if="canEdit">
                  <button class="btn btn-sm btn-danger" @click="removeChild(child.node_id)">Удалить из состава</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-message">Нет дочерних узлов</div>
      </div>

      <!-- Ресурсы -->
      <div class="subsection">
        <div class="subsection-header">
          <h4>Ресурсы</h4>
          <button v-if="canEdit" class="btn btn-sm btn-primary" @click="openAddResourceForm">+ Добавить ресурс</button>
        </div>
        <div class="table-wrapper" v-if="resources.length">
          <table class="data-table">
            <thead>
              <tr>
                <th>Наименование ресурса</th>
                <th>Параметры</th>
                <th>Дата регистрации</th>
                <th>Примечание</th>
                <th v-if="canEdit">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="res in resources" :key="res.id || res.registration_date">
                <td>
                  <span class="clickable-link" @click="goToResource(res.node_id)">{{ res.resource_params?.name || 'Ресурс' }}</span>
                </td>
                <td>{{ JSON.stringify(res.resource_params) }}</td>
                <td>{{ res.registration_date }}</td>
                <td>{{ res.note || '-' }}</td>
                <td v-if="canEdit">
                  <button class="btn btn-sm btn-secondary" @click="editResource(res)">✏️</button>
                  <button class="btn btn-sm btn-danger" @click="deleteResource(res.node_id)">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-message">Ресурсы не добавлены</div>
      </div>
    </div>

    <!-- История перемещений -->
    <div class="section" v-if="moveHistory.length">
      <h3>История перемещений</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><tr><th>Дата</th><th>Откуда</th><th>Куда</th><th>Пользователь</th></tr></thead>
          <tbody>
            <tr v-for="rec in moveHistory" :key="rec.id">
              <td>{{ rec.date || rec.moved_at }}</td>
              <td>{{ rec.from_location || rec.previous_location || '-' }}</td>
              <td>{{ rec.to_location || rec.new_location }}</td>
              <td>{{ rec.user_id || rec.moved_by_user || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- История комплектаций -->
    <div class="section" v-if="compositionHistory.length">
      <h3>История комплектаций</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead><td><th>Дата</th><th>Действие</th><th>Узел</th><th>Пользователь</th></td></thead>
          <tbody>
            <tr v-for="rec in compositionHistory" :key="rec.id">
              <td>{{ rec.date }}</td>
              <td>{{ rec.action === 'add' ? '➕ Добавлен в состав' : '➖ Удалён из состава' }}</td>
              <td>{{ rec.child_name || rec.child_id }}</td>
              <td>{{ rec.user_id || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Модальные окна -->
    <EquipmentForm
      :visible="showEditModal"
      :nodeId="editingNodeId"
      @update:visible="showEditModal = $event"
      @saved="refresh"
    />
    <AddChildModal ref="addChildModalRef" @added="refresh" />
    <ConfirmDialog ref="confirmDialog" />
    <ResourceForm ref="resourceFormRef" @saved="refresh" />

    <!-- Модалка перемещения -->
    <div class="modal-overlay" v-if="showMoveModal" @click.self="closeMoveModal">
      <div class="modal-content">
        <div class="modal-header">Перемещение узла</div>
        <div class="modal-body">
          <input v-model="newLocation" class="form-control" />
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeMoveModal">Отмена</button>
          <button class="btn btn-primary" @click="saveMove">Переместить</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import EquipmentForm from '../components/EquipmentForm.vue';
import AddChildModal from '../components/AddChildModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import ResourceForm from '../components/ResourceForm.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useEquipmentStore();

const addChildModalRef = ref();
const confirmDialog = ref();
const resourceFormRef = ref();
const node = ref<any>(null);
const children = ref<any[]>([]);
const resources = ref<any[]>([]);
const moveHistory = ref<any[]>([]);
const compositionHistory = ref<any[]>([]);
const showMoveModal = ref(false);
const newLocation = ref('');
const parentName = ref('');
const showEditModal = ref(false);
const editingNodeId = ref<string | null>(null);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  try { return ['operator', 'admin'].includes(JSON.parse(user).role); } catch { return false; }
});

const parametersList = computed(() => {
  if (!node.value?.parameters) return {};
  try {
    return typeof node.value.parameters === 'string'
      ? JSON.parse(node.value.parameters)
      : node.value.parameters;
  } catch { return {}; }
});

function getMainParamsShort(child: any) {
  if (!child.parameters) return '-';
  try {
    const params = typeof child.parameters === 'string'
      ? JSON.parse(child.parameters)
      : child.parameters;
    const mains = Object.entries(params).filter(([_, v]: any) => v?.isMain === true);
    return mains.map(([k, v]: any) => `${k}: ${v.value} ${v.unit || ''}`).join(', ') || '-';
  } catch { return '-'; }
}

async function loadParentName() {
  if (node.value?.installed_in_node) {
    const parent = await store.getNode(node.value.installed_in_node);
    parentName.value = parent ? parent.name : '-';
  } else parentName.value = '-';
}

async function loadById(id?: string) {
  const targetId = id ?? (route.params.id as string);
  const data = await store.getNode(targetId);
  if (data) {
    node.value = data;
    children.value = store.allNodes.filter((n: any) => n.installed_in_node === targetId && n.status !== 'списан');
    resources.value = await store.getResourcesForNode(targetId);
    moveHistory.value = await store.getMoveHistoryForNode(targetId);
    compositionHistory.value = [];
    await loadParentName();
  } else router.push('/equipment');
}

function refresh() { loadById(); }
function goBack() { router.push('/equipment'); }
function editNode() { editingNodeId.value = node.value?.node_id; showEditModal.value = true; }
async function deleteNode() {
  const ok = await confirmDialog.value?.show('Списание', 'Списать узел?');
  if (ok) {
    await store.deleteNode(node.value.node_id);
    router.push('/equipment');
  }
}
function openMoveModal() { newLocation.value = node.value?.location || ''; showMoveModal.value = true; }
function closeMoveModal() { showMoveModal.value = false; }
async function saveMove() {
  if (!node.value) return;
  const oldLoc = node.value.location || '';
  if (newLocation.value !== oldLoc) {
    await store.updateNode(node.value.node_id, { location: newLocation.value });
    await store.addMoveRecord(node.value.node_id, oldLoc, newLocation.value);
    refresh();
  }
  closeMoveModal();
}
function openAddChildModal() { addChildModalRef.value?.open(node.value.node_id); }
async function removeChild(childId: string) {
  const ok = await confirmDialog.value?.show('Удаление из состава', 'Удалить узел из состава?');
  if (ok) {
    await store.removeChild(node.value.node_id, childId);
    refresh();
  }
}
function openAddResourceForm() { resourceFormRef.value?.open(node.value.node_id); }
function editResource(res: any) { resourceFormRef.value?.open(node.value.node_id, res); }
async function deleteResource(nodeId: string) {
  const ok = await confirmDialog.value?.show('Удаление ресурса', 'Удалить ресурс?');
  if (ok) {
    await store.deleteResource(nodeId);
    refresh();
  }
}
function goToResource(nodeId: string) { router.push({ path: '/resources', query: { nodeId } }); }
function viewChild(childId: string) {
  const child = store.allNodes.find((n: any) => n.node_id === childId);
  if (child?.is_si) router.push({ path: '/si', query: { nodeId: childId } });
  else router.push(`/equipment/${childId}`);
}
function goToParent() {
  if (node.value?.installed_in_node) router.push(`/equipment/${node.value.installed_in_node}`);
}

watch(() => route.params.id, (newId) => {
  if (newId) loadById(newId as string);
}, { immediate: true });
</script>

<style scoped>
/* Шапка: кнопки строго в правом верхнем углу */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.action-buttons {
  display: flex;
  gap: 10px;
}

/* Остальные стили – минимальные, только для специфики карточки.
   Все основные стили (кнопок, таблиц, модалок) берутся из глобального style.css */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}
.info-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
}
.info-row strong {
  width: 160px;
}
.section {
  margin-top: 32px;
  border-top: 1px solid #e2e8f0;
  padding-top: 24px;
}
.section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}
.subsection {
  margin-top: 24px;
  margin-left: 16px;
}
.subsection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.subsection h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #334155;
}
.table-wrapper {
  overflow-x: auto;
  width: 100%;
  margin-bottom: 16px;
  border-radius: 8px;
}
.empty-message {
  color: #94a3b8;
  font-style: italic;
  padding: 12px;
  text-align: center;
  background: #f8fafc;
  border-radius: 6px;
}
.clickable-link {
  cursor: pointer;
  color: #2c5f8a;
  text-decoration: none;
}
.clickable-link:hover {
  text-decoration: underline;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
}
.modal-header {
  padding: 16px;
  border-bottom: 1px solid #e0e4e8;
  font-weight: bold;
}
.modal-body {
  padding: 16px;
}
.modal-footer {
  padding: 12px 16px;
  border-top: 1px solid #e0e4e8;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.form-control {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}
</style>