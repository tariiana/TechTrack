<template>
  <div class="card" v-if="instrument">
    <!-- Кнопки сверху справа -->
    <div class="card-actions">
      <button class="btn btn-secondary" @click="goBack">← Назад</button>
      <button v-if="canEdit" class="btn btn-primary" @click="editInstrument">Редактировать</button>
      <button v-if="canEdit && instrument.status !== 'списано'" class="btn btn-danger" @click="writeOffInstrument">Списать</button>
    </div>

    <h2>Средства измерения</h2>

    <div class="card-detail-grid">
      <div class="detail-col">
        <div class="detail-row">
          <div class="detail-label">Тип</div>
          <div class="detail-value">{{ instrument.typeName || '-' }}</div>
          <div class="detail-label">Марка</div>
          <div class="detail-value">{{ instrument.model || '-' }}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Производитель</div>
          <div class="detail-value">{{ instrument.manufacturer || '-' }}</div>
          <div class="detail-label">Дата производства</div>
          <div class="detail-value">{{ instrument.productionDate || '-' }}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Узел</div>
          <div class="detail-value">{{ instrument.nodeName || '-' }}</div>
          <div class="detail-label">Статус</div>
          <div class="detail-value" :class="{ 'status-disabled': instrument.status === 'списано' }">
            {{ instrument.status === 'списано' ? 'Списано' : instrument.status }}
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Размещение</div>
          <div class="detail-value">{{ instrument.location || '-' }}</div>
          <div class="detail-label">Основные параметры</div>
          <div class="detail-value">
            <div v-if="paramsList.length > 0" class="params-list">
              <div v-for="param in paramsList" :key="param.name" class="param-item">
                <span class="param-name">{{ param.name }}:</span>
                <span class="param-value">{{ param.value }}</span>
                <span v-if="param.unit" class="param-unit">{{ param.unit }}</span>
              </div>
            </div>
            <span v-else>-</span>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Дата сдачи в поверку</div>
          <div class="detail-value">{{ formatDate(instrument.transferDate) || '-' }}</div>
          <div class="detail-label">Дата получения из поверки</div>
          <div class="detail-value">{{ formatDate(instrument.receiptDate) || '-' }}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Дата последней поверки</div>
          <div class="detail-value">{{ lastVerificationDate ? formatDate(lastVerificationDate) : '-' }}</div>
          <div class="detail-label">Дата следующей поверки</div>
          <div class="detail-value">
            <template v-if="nextVerificationDate">{{ formatDate(nextVerificationDate) }}<span v-if="isWarning && instrument.status !== 'списано'" class="warning-badge">(менее 30 дней)</span></template>
            <template v-else>-</template>
          </div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Межповерочный интервал</div>
          <div class="detail-value">{{ instrument.verificationInterval }} год(а)</div>
          <div class="detail-label">Поверитель</div>
          <div class="detail-value">{{ instrument.verifier || '-' }}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Табельный номер</div>
          <div class="detail-value">{{ instrument.tabNumber || '-' }}</div>
          <div class="detail-label">Примечание</div>
          <div class="detail-value">{{ instrument.notes || '-' }}</div>
        </div>
      </div>
    </div>

    <!-- История поверок с прокруткой -->
    <div style="margin-top: 20px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px">
        <h3>История поверок</h3>
        <button v-if="canEdit && instrument.status !== 'списано'" class="btn btn-primary btn-sm" @click="openAddVerification">+ Добавить поверку</button>
      </div>
      
      <div class="table-scroll-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Дата передачи</th>
              <th>Дата получения</th>
              <th>Поверитель</th>
              <th>Результат</th>
              <th v-if="canEdit">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in verifications" :key="v.id">
              <td>{{ formatDate(v.transferDate) }}</td>
              <td>{{ formatDate(v.receiptDate) }}</td>
              <td>{{ v.verifier }}</td>
              <td :class="{ 'result-bad': v.result === 'не годен' }">{{ v.result }}</td>
              <td v-if="canEdit">
                <button class="btn btn-sm btn-secondary" @click="editVerification(v)">✏️</button>
              </td>
            </tr>
            <tr v-if="verifications.length === 0">
              <td colspan="5">Нет записей о поверках</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <SIForm ref="siFormRef" @si-saved="refresh" />
    <VerificationForm ref="verFormRef" @verification-saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
  <div v-else class="card">Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSIStore } from '../stores/siStore';
import SIForm from '../components/SIForm.vue';
import VerificationForm from '../components/VerificationForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate, getDaysUntilVerification } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useSIStore();
const siFormRef = ref();
const verFormRef = ref();
const confirmDialog = ref();

const instrument = ref<any>(null);
const verifications = ref<any[]>([]);
const lastVerificationDate = ref('');
const nextVerificationDate = ref('');
const paramsList = ref<any[]>([]);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  const role = JSON.parse(user).role;
  return role === 'operator' || role === 'admin';
});

const isWarning = computed(() => {
  if (!instrument.value || instrument.value.status === 'списано') return false;
  if (!nextVerificationDate.value) return false;
  const days = getDaysUntilVerification(nextVerificationDate.value);
  return days <= 30 && days >= 0;
});

// Преобразование JSON параметров в список для отображения
function loadParamsFromJson() {
  if (!instrument.value?.mainParams) {
    paramsList.value = [];
    return;
  }
  
  const params = instrument.value.mainParams;
  const list: any[] = [];
  
  for (const [key, rawValue] of Object.entries(params)) {
    let value = String(rawValue);
    let unit = '';
    
    // Пробуем отделить значение от единицы измерения
    const match = value.match(/^([\d.,]+)\s*(.+)$/);
    if (match && match[1] && match[2]) {
      value = match[1];
      unit = match[2].trim();
    }
    
    list.push({
      name: key,
      value: value,
      unit: unit
    });
  }
  
  paramsList.value = list;
}

async function loadData() {
  const id = String(route.params.id);
  instrument.value = await store.fetchInstrumentById(id);
  if (instrument.value) {
    const data = await store.fetchVerifications(id);
    verifications.value = data;
    lastVerificationDate.value = store.getLastVerificationDate(id) || instrument.value.lastVerificationDate || '';
    nextVerificationDate.value = store.getNextVerificationDate(id) || instrument.value.nextVerificationDate || '';
    loadParamsFromJson();
  }
}

function goBack() { router.push('/si'); }
function editInstrument() { siFormRef.value?.open(instrument.value); }
async function writeOffInstrument() {
  const ok = await confirmDialog.value?.show('Списание', 'Списать СИ?');
  if (ok) {
    await store.writeOffInstrument(instrument.value.id);
    router.push('/si');
  }
}
function openAddVerification() { verFormRef.value?.open(instrument.value.id); }
function editVerification(v: any) { verFormRef.value?.open(instrument.value.id, v); }
function refresh() { loadData(); }

onMounted(() => {
  loadData();
  window.addEventListener('si-saved', refresh);
  window.addEventListener('verification-saved', refresh);
});
</script>

<style scoped>
.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e0e4e8;
}
.card-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.card-detail-grid {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}
.detail-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-row {
  display: grid;
  grid-template-columns: 180px 1fr 180px 1fr;
  gap: 16px;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px solid #e0e4e8;
}
.detail-row:last-child {
  border-bottom: none;
}
.detail-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
}
.detail-value {
  color: #1a2a3a;
  font-size: 13px;
}
.status-disabled {
  color: #999;
  font-style: italic;
}
.result-bad {
  color: #c0392b;
  font-weight: 500;
}
.warning-badge {
  background-color: #e67e22;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  margin-left: 8px;
}
.params-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.param-item {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.param-name {
  font-weight: 500;
  color: #2c3e50;
}
.param-value {
  color: #1a2a3a;
}
.param-unit {
  color: #6c757d;
  font-size: 12px;
}
.table-scroll-container {
  width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 400px;
  border: 1px solid #e0e4e8;
  border-radius: 8px;
  background: white;
}
.table-scroll-container .data-table {
  min-width: 600px;
}
@media (max-width: 768px) {
  .detail-row {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .card-actions {
    justify-content: center;
  }
}
</style>