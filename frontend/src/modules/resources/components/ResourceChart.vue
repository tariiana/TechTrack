<template>
  <div class="card" v-if="resource">
    <div class="card-header">
      <h2>{{ resource.name }}</h2>
      <div class="header-buttons">
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editResource">Редактировать</button>
        <button v-if="canEdit" class="btn btn-danger" @click="deleteResource">Списать</button>
        <div class="dropdown">
          <button class="btn btn-secondary" @click="toggleExportDropdown">📎 Экспорт</button>
          <div v-if="exportDropdownOpen" class="dropdown-menu">
            <button class="dropdown-item" @click="exportToExcel">Excel</button>
            <button class="dropdown-item" @click="exportToWord">Word</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Основные сведения -->
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
        <div class="info-value">{{ resource.productionDate || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Узел</div>
        <div class="info-value">{{ resource.nodeName || '-' }}</div>
        <div class="info-label">Срок службы</div>
        <div class="info-value">{{ resource.serviceLife ? resource.serviceLife + ' лет' : '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата регистрации</div>
        <div class="info-value">{{ resource.registrationDate }}</div>
        <div class="info-label">Учётный номер</div>
        <div class="info-value">{{ resource.registrationNumber || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Дата последнего ТО</div>
        <div class="info-value">{{ resource.lastServiceDate || '-' }}</div>
        <div class="info-label">Срок до ТО</div>
        <div class="info-value">{{ resource.timeToService ? resource.timeToService + ' лет' : '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Исходный ресурс</div>
        <div class="info-value">{{ resource.initialResource || '-' }}</div>
        <div class="info-label">Остаточный ресурс</div>
        <div class="info-value">{{ resource.remainingResource || '-' }}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Установлен в</div>
        <div class="info-value">{{ resource.installedIn || '-' }}</div>
      </div>
    </div>

    <!-- Предупреждения -->
    <div v-if="alerts.length" class="alerts-section">
      <h4>⚠️ Предупреждения</h4>
      <ul>
        <li v-for="(alert, idx) in alerts" :key="idx" :class="alert.type">{{ alert.message }}</li>
      </ul>
    </div>

    <!-- Параметры (из resource_params) -->
    <h3>Параметры</h3>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Параметр</th>
            <th>Значение</th>
            <th>Ед. изм.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key) in resourceParams" :key="key">
            <td>{{ key }}</td>
            <td>{{ value }}</td>
            <td>{{ getUnitHint(key) }}</td>
          </tr>
          <tr v-if="Object.keys(resourceParams).length === 0">
            <td colspan="3">Нет параметров</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Примечания -->
    <div class="notes-section" v-if="resource.notes">
      <h4>Примечания</h4>
      <p>{{ resource.notes }}</p>
    </div>

    <div class="text-muted">
      <small>Создан: {{ resource.createdAt }} | Обновлён: {{ resource.updatedAt }}</small>
    </div>

    <ResourceForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useResourcesStore } from '../stores/resourcesStore';
import ResourceForm from './ResourceForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';
import * as XLSX from 'xlsx';

const route = useRoute();
const router = useRouter();
const store = useResourcesStore();
const formRef = ref();
const confirmDialog = ref();
const exportDropdownOpen = ref(false);

const resource = ref<any>(null);
const resourceParams = ref<Record<string, any>>({});

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  try {
    const role = JSON.parse(user).role;
    return role === 'operator' || role === 'admin';
  } catch { return false; }
});

const alerts = computed(() => {
  const result: { type: string; message: string }[] = [];
  if (!resource.value) return result;
  if (resource.value.timeToService !== undefined && resource.value.timeToService < 0) {
    result.push({ type: 'danger', message: '🔴 Срок до ТО просрочен!' });
  } else if (resource.value.timeToService !== undefined && resource.value.timeToService < 1) {
    result.push({ type: 'warning', message: `⚠️ Срок до ТО менее года (${resource.value.timeToService} лет)` });
  }
  if (resource.value.serviceLife) {
    const yearsPassed = new Date().getFullYear() - new Date(resource.value.registrationDate).getFullYear();
    const remaining = resource.value.serviceLife - yearsPassed;
    if (remaining < 0) {
      result.push({ type: 'danger', message: '🔴 Срок службы истёк!' });
    } else if (remaining < 1) {
      result.push({ type: 'warning', message: `⚠️ Срок службы истекает (осталось ${remaining} лет)` });
    }
  }
  const remainingPercent = parseFloat(resource.value.remainingResource || '0');
  if (remainingPercent <= 0) {
    result.push({ type: 'danger', message: '🔴 Ресурс исчерпан!' });
  } else if (remainingPercent < 20) {
    result.push({ type: 'warning', message: `⚠️ Остаточный ресурс менее 20% (${remainingPercent}%)` });
  }
  return result;
});

function getUnitHint(key: string): string {
  const units: Record<string, string> = {
    capacity: '%',
    voltage: 'В',
    resistance: 'Ом',
    remainingLife: 'лет',
    energy: 'Втч',
    current: 'мАч'
  };
  return units[key] || '';
}

async function loadData() {
  const id = route.params.id as string;
  try {
    const fullResource = await store.fetchResourceById(id);
    resource.value = fullResource;
    resourceParams.value = fullResource.resource_params || {};
  } catch (err) {
    console.error(err);
  }
}

function goBack() { router.back(); }
function editResource() { formRef.value?.open(resource.value); }
async function deleteResource() {
  const ok = await confirmDialog.value?.show('Списание', 'Списать ресурс?');
  if (ok) { store.deleteResource(resource.value.resource_id); router.back(); }
}
function refresh() { loadData(); }
function toggleExportDropdown() { exportDropdownOpen.value = !exportDropdownOpen.value; }

// Экспорт
function getExportData() {
  if (!resource.value) return [];
  const params = resourceParams.value;
  const rows = [
    ['Наименование', resource.value.name],
    ['Марка', resource.value.mark || ''],
    ['Тип', resource.value.type || ''],
    ['Дата производства', resource.value.productionDate || ''],
    ['Узел', resource.value.nodeName || ''],
    ['Срок службы', resource.value.serviceLife ? `${resource.value.serviceLife} лет` : ''],
    ['Дата регистрации', resource.value.registrationDate],
    ['Учётный номер', resource.value.registrationNumber || ''],
    ['Дата последнего ТО', resource.value.lastServiceDate || ''],
    ['Срок до ТО', resource.value.timeToService ? `${resource.value.timeToService} лет` : ''],
    ['Исходный ресурс', resource.value.initialResource || ''],
    ['Остаточный ресурс', resource.value.remainingResource || ''],
    ['Установлен в', resource.value.installedIn || ''],
    ['Примечания', resource.value.notes || ''],
    [],
    ['Параметры'],
    ...Object.entries(params).map(([key, val]) => [key, val, getUnitHint(key)])
  ];
  return rows;
}

function exportToExcel() {
  if (!resource.value) return;
  const wsData = getExportData();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, resource.value.name.slice(0, 31));
  XLSX.writeFile(wb, `${resource.value.name}.xlsx`);
  exportDropdownOpen.value = false;
}

function exportToWord() {
  if (!resource.value) return;
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${resource.value.name}</title><style>body{font-family:Arial;} table{border-collapse:collapse;width:100%} th,td{border:1px solid #000;padding:6px;text-align:left}</style></head><body>`;
  html += `<h1>${resource.value.name}</h1>`;
  html += `<h2>Основные сведения</h2><table border="1">`;
  html += `<tr><th>Наименование</th><td>${resource.value.name}</td><th>Марка</th><td>${resource.value.mark || '-'}</td></tr>`;
  html += `<tr><th>Тип</th><td>${resource.value.type || '-'}</td><th>Дата производства</th><td>${resource.value.productionDate || '-'}</td></tr>`;
  html += `<tr><th>Узел</th><td>${resource.value.nodeName || '-'}</td><th>Срок службы</th><td>${resource.value.serviceLife ? resource.value.serviceLife + ' лет' : '-'}</td></tr>`;
  html += `<tr><th>Дата регистрации</th><td>${resource.value.registrationDate}</td><th>Учётный номер</th><td>${resource.value.registrationNumber || '-'}</td></tr>`;
  html += `<tr><th>Дата последнего ТО</th><td>${resource.value.lastServiceDate || '-'}</td><th>Срок до ТО</th><td>${resource.value.timeToService ? resource.value.timeToService + ' лет' : '-'}</td></tr>`;
  html += `<tr><th>Исходный ресурс</th><td>${resource.value.initialResource || '-'}</td><th>Остаточный ресурс</th><td>${resource.value.remainingResource || '-'}</td></tr>`;
  html += `<tr><th>Установлен в</th><td colspan="3">${resource.value.installedIn || '-'}</td></tr>`;
  html += `</table><h2>Параметры</h2><table border="1"><tr><th>Параметр</th><th>Значение</th><th>Ед. изм.</th></tr>`;
  for (const [key, val] of Object.entries(resourceParams.value)) {
    html += `<tr><td>${key}</td><td>${val}</td><td>${getUnitHint(key)}</td></tr>`;
  }
  html += `</table>`;
  if (resource.value.notes) html += `<h2>Примечания</h2><p>${resource.value.notes}</p>`;
  html += `</body></html>`;
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${resource.value.name}.doc`;
  link.click();
  URL.revokeObjectURL(url);
  exportDropdownOpen.value = false;
}

onMounted(() => {
  loadData();
  window.addEventListener('resource-saved', refresh);
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header-buttons {
  display: flex;
  gap: 10px;
}
.info-grid {
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}
.info-row {
  display: grid;
  grid-template-columns: 150px 1fr 150px 1fr;
  border-bottom: 1px solid #e0e4e8;
}
.info-row:last-child { border-bottom: none; }
.info-label {
  background-color: #f8f9fa;
  padding: 10px 12px;
  font-weight: 500;
  border-right: 1px solid #e0e4e8;
}
.info-value { padding: 10px 12px; }
.alerts-section {
  background-color: #fff3e0;
  border-left: 4px solid #e67e22;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
}
.alerts-section .danger { color: #c0392b; }
.notes-section { margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
.text-muted { color: #6c757d; margin-top: 15px; }
.dropdown { position: relative; display: inline-block; }
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e0e4e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;
  min-width: 120px;
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
}
.dropdown-item:hover { background-color: #f0f2f5; }
</style>