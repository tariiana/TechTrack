<template>
  <div class="card" v-if="resource">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Ресурсы</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editResource">Редактировать</button>
        <button v-if="canEdit" class="btn btn-danger" @click="deleteResource">Удалить</button>
      </div>
    </div>

    <!-- Основные сведения (2 колонки) -->
    <div class="info-grid">
      <div class="info-row">
        <div class="info-label">Наименование</div>
        <div class="info-value">{{ resource.name }}</div>
        <div class="info-label">Марка</div>
        <div class="info-value">{{ resource.mark || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Тип</div>
        <div class="info-value">{{ resource.type || '-' }}</div>
        <div class="info-label">Дата производства</div>
        <div class="info-value">{{ resource.production_date || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Узел</div>
        <div class="info-value">{{ resource.node_name || '-' }}</div>
        <div class="info-label">Срок службы</div>
        <div class="info-value">{{ resource.service_life ? resource.service_life + ' лет' : '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата регистрации</div>
        <div class="info-value">{{ resource.registration_date }}</div>
        <div class="info-label">Учётный номер</div>
        <div class="info-value">{{ resource.registration_number || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата ТО</div>
        <div class="info-value">{{ resource.last_service_date || '-' }}</div>
        <div class="info-label">Срок до ТО</div>
        <div class="info-value">{{ resource.time_to_service ? resource.time_to_service + ' лет' : '-' }}</div>
      </div>
    </div>

    <!-- Предупреждения -->
    <div v-if="alerts.length" class="alert-banner">
      <h4>⚠️ Предупреждения</h4>
      <ul>
        <li v-for="(alert, idx) in alerts" :key="idx" :class="alert.type">{{ alert.message }}</li>
      </ul>
    </div>

    <!-- Таблица параметров с прокруткой -->
    <h3>Параметры</h3>
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
          <tr v-for="param in parameters" :key="param.parameter_id">
            <td>{{ param.name }}</td>
            <td>{{ param.value }}</td>
            <td>{{ param.unit || '-' }}</td>
            <td>{{ param.is_main ? '✅' : '' }}</td>
          </tr>
          <tr v-if="parameters.length === 0">
            <td colspan="4">Нет параметров</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="empty-message">Нет параметров</div>

    <div class="text-muted" style="margin-top: 15px">
      <small>Создан: {{ formatDate(resource.created_at) }} | Обновлён: {{ formatDate(resource.updated_at) }}</small>
    </div>

    <ResourceForm ref="formRef" @saved="refresh" />
    <ResourceParameters ref="parametersRef" :resource-id="resource.resource_id" @refresh="loadData" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import ResourceForm from './ResourceForm.vue';
import ResourceParameters from './ResourceParameters.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useResourcesStore();
const formRef = ref();
const parametersRef = ref();
const confirmDialog = ref();

const resource = ref<any>(null);
const parameters = ref<any[]>([]);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

const alerts = computed(() => {
  const result: { type: string; message: string }[] = [];
  if (!resource.value) return result;

  const timeToService = resource.value.time_to_service;
  if (timeToService !== undefined && timeToService < 0) {
    result.push({ type: 'danger', message: '🔴 Срок до ТО просрочен!' });
  } else if (timeToService !== undefined && timeToService < 1) {
    result.push({ type: 'warning', message: `⚠️ Срок до ТО менее года (${timeToService} лет)` });
  }
  
  const remaining = resource.value.remaining_resource;
  if (remaining !== undefined && remaining <= 20) {
    result.push({ type: 'danger', message: `🔴 Остаточный ресурс критический (${remaining}%)` });
  } else if (remaining !== undefined && remaining <= 50) {
    result.push({ type: 'warning', message: `⚠️ Остаточный ресурс менее 50% (${remaining}%)` });
  }
  
  return result;
});

async function loadData() {
  const id = route.params.id as string;
  try {
    resource.value = await store.fetchResourceById(id);
    await loadParameters();
  } catch (err) {
    console.error(err);
  }
}

async function loadParameters() {
  if (!resource.value) return;
  const params = resource.value.resource_params || {};
  const paramsArray: any[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'measurements' && typeof value === 'object' && value !== null) {
      paramsArray.push({
        parameter_id: key,
        name: key,
        value: (value as any).value || value,
        unit: (value as any).unit || '',
        is_main: (value as any).is_main || false,
      });
    } else if (key !== 'measurements' && typeof value !== 'object') {
      paramsArray.push({
        parameter_id: key,
        name: key,
        value: value,
        unit: '',
        is_main: false,
      });
    }
  }
  parameters.value = paramsArray;
}

function goBack() { router.back(); }
function editResource() { formRef.value?.open(resource.value); }
async function deleteResource() {
  const ok = await confirmDialog.value?.show('Удаление', 'Удалить ресурс?');
  if (ok) {
    await store.deleteResource(resource.value.resource_id);
    router.back();
  }
}
function refresh() { loadData(); }

onMounted(() => {
  loadData();
  window.addEventListener('resource-saved', refresh);
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
.alert-banner {
  background-color: #fff3e0;
  border-left: 4px solid #e67e22;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
}
.alert-banner .danger { color: #c0392b; }
.text-muted { color: #6c757d; }
.empty-message { color: #999; font-style: italic; padding: 10px; }

/* Контейнер для таблицы с прокруткой */
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

/* Стили для таблицы внутри контейнера */
.table-scroll-container .data-table {
  min-width: 500px;
}
</style>