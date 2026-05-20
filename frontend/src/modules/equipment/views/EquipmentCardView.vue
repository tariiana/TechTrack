<template>
  <div class="card" v-if="node">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Оборудование</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editNode">Редактировать</button>
        <button v-if="canEdit && node.status !== 'списан'" class="btn btn-danger" @click="writeOffNode">Списать</button>
      </div>
    </div>

    <!-- Основные сведения (2 колонки) -->
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Марка</div>
        <div class="info-value">{{ node.model || '-' }}</div>
        <div class="info-label">Тип</div>
        <div class="info-value">{{ node.type_name || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Наименование</div>
        <div class="info-value">{{ node.name }}</div>
        <div class="info-label">Узел</div>
        <div class="info-value">{{ node.parent_name || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Подсистема</div>
        <div class="info-value">{{ node.subsystem_name || '-' }}</div>
        <div class="info-label">Размещение</div>
        <div class="info-value">{{ node.location || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Производитель</div>
        <div class="info-value">{{ node.manufacturer || '-' }}</div>
        <div class="info-label">Дата производства</div>
        <div class="info-value">{{ formatDate(node.production_date) }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата установки</div>
        <div class="info-value">{{ formatDate(node.commission_date) }}</div>
        <div class="info-label">Ресурс</div>
        <div class="info-value">{{ node.resource || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Состояние</div>
        <div class="info-value">{{ node.status || '-' }}</div>
        <div class="info-label">СИ</div>
        <div class="info-value">{{ node.is_si ? 'Да' : 'Нет' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Заводской номер</div>
        <div class="info-value">{{ node.serial_number || '-' }}</div>
        <div class="info-label">Инвентарный номер</div>
        <div class="info-value">{{ node.inventory_number || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Учетный номер</div>
        <div class="info-value">{{ node.accounting_number || '-' }}</div>
        <div class="info-label">Агрегат</div>
        <div class="info-value">{{ node.is_aggregate ? 'Да' : 'Нет' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Режим работы</div>
        <div class="info-value">{{ node.operation_mode || '-' }}</div>
        <div class="info-label"></div>
        <div class="info-value"></div>
      </div>
    </div>

    <!-- Таблица параметров с прокруткой -->
    <h3 style="margin-top: 20px">Параметры</h3>
    <div class="table-scroll-container" v-if="parameters.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
            <th>Ед. изм.</th>
            <th>Основной</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(param, name) in parameters" :key="name">
            <td>{{ name }}</td>
            <td>{{ param.value }}</td>
            <td>{{ param.unit || '-' }}</td>
            <td>{{ param.is_main ? '✅' : '' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-message">Параметры не заданы</div>

    <!-- Установленные узлы и ресурсы с прокруткой -->
    <h3 style="margin-top: 20px">Установленные узлы и ресурсы</h3>
    <div class="table-scroll-container" v-if="children.length">
      <table class="data-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Тип</th>
            <th>Производитель</th>
            <th>Марка</th>
            <th>Основные параметры</th>
            <th>Примечания</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="child in children" :key="child.node_id">
            <td>
              <button class="link-btn" @click="viewCard(child.node_id)">{{ child.name }}</button>
            </td>
            <td>{{ child.type_name || '-' }}</td>
            <td>{{ child.manufacturer || '-' }}</td>
            <td>{{ child.model || '-' }}</td>
            <td>{{ getMainParams(child) }}</td>
            <td>{{ child.note || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-message">Нет установленных узлов или ресурсов</div>

    <EquipmentForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEquipmentStore } from '../stores/equipmentStore';
import EquipmentForm from '../components/EquipmentForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useEquipmentStore();
const formRef = ref();
const confirmDialog = ref();

const node = ref<any>(null);
const children = ref<any[]>([]);
const parameters = ref<Record<string, any>>({});

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

function getMainParams(child: any): string {
  if (!child.parameters) return '-';
  const params = typeof child.parameters === 'string' ? JSON.parse(child.parameters) : child.parameters;
  const mains = Object.entries(params)
    .filter(([_, val]: any) => val?.is_main)
    .map(([key, val]: any) => `${key}: ${val.value} ${val.unit || ''}`.trim())
    .join(', ');
  return mains || '-';
}

async function loadData() {
  const id = route.params.id as string;
  node.value = await store.fetchNodeById(id);
  if (node.value) {
    children.value = await store.fetchNodeChildren(id) || [];
    if (node.value.parameters) {
      parameters.value = typeof node.value.parameters === 'string' 
        ? JSON.parse(node.value.parameters) 
        : node.value.parameters;
    }
  }
}

function goBack() { router.back(); }
function editNode() { formRef.value?.open(node.value); }
function viewCard(id: string) { router.push(`/equipment/${id}`); }
async function writeOffNode() {
  const ok = await confirmDialog.value?.show('Списание', 'Списать узел?');
  if (ok) {
    await store.writeOffNode(node.value.node_id);
    router.back();
  }
}
function refresh() { loadData(); }

onMounted(() => {
  loadData();
  window.addEventListener('node-saved', refresh);
});
</script>

<style scoped>
.info-grid {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}
.info-row {
  display: grid;
  grid-template-columns: 150px 1fr 150px 1fr;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #e0e4e8;
}
.info-row:last-child { border-bottom: none; }
.info-label { font-weight: 600; color: #2c3e50; }
.info-value { color: #1a2a3a; }
.empty-message { color: #999; font-style: italic; padding: 10px; }
.link-btn {
  background: none;
  border: none;
  color: #2c5f8a;
  cursor: pointer;
  text-decoration: underline;
}
.link-btn:hover { color: #1e4566; }

/* Контейнер для таблиц с прокруткой */
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 400px;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  background: white;
  margin: 10px 0;
}

.table-scroll-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: #e0e4e8;
  border-radius: 6px;
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: #2c5f8a;
  border-radius: 6px;
  cursor: pointer;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #1e4566;
}

/* Стили для таблиц внутри контейнера */
.table-scroll-container .data-table {
  min-width: 600px;
}
</style>