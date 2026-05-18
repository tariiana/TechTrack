<template>
  <div class="card">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px">
      <h2>Средства измерения</h2>
      <div class="action-buttons">
        <button v-if="canEdit" class="btn btn-primary" @click="openAddForm">+ Добавить СИ</button>
        <button class="btn btn-secondary" @click="exportData">📎 Экспорт</button>
      </div>
    </div>

    <!-- Панель фильтров -->
    <div class="filter-panel">
      <input v-model="filters.search" placeholder="Поиск" class="form-control" @input="applyFilters" />
      <select v-model="filters.status" class="form-control" @change="applyFilters">
        <option value="">Все статусы</option>
        <option value="в эксплуатации">В эксплуатации</option>
        <option value="на поверке">На поверке</option>
        <option value="списано">Списано</option>
      </select>
    </div>

    <!-- Таблица -->
    <table class="data-table" v-if="!store.isLoading">
      <thead>
        <tr><th>Таб. номер</th><th>Наименование</th><th>Статус</th><th>След. поверка</th><th>Действия</th></tr>
      </thead>
      <tbody>
        <tr v-for="item in store.instruments" :key="item.instrument_id">
          <td>{{ item.tab_number }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.status }}</td>
          <td>{{ formatDate(item.next_calibration_date) }}</td>
          <td>
            <button class="btn-sm btn-secondary" @click="viewCard(item.instrument_id)">Открыть</button>
            <button v-if="canEdit" class="btn-sm btn-secondary" @click="editItem(item)">✏️</button>
            <button v-if="canEdit" class="btn-sm btn-danger" @click="deleteItem(item.instrument_id)">Списать</button>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="store.isLoading" class="loading">Загрузка...</div>

    <!-- Модальные окна -->
    <SIForm ref="formRef" @saved="refresh" />
    <ConfirmDialog ref="confirmDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSIStore } from '../stores/siStore';
import SIForm from './SIForm.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { formatDate } from '@/utils/dateUtils';

const router = useRouter();
const store = useSIStore();
const formRef = ref();
const confirmDialog = ref();

const filters = ref({ search: '', status: '' });
const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  return user && ['operator', 'admin'].includes(JSON.parse(user).role);
});

function applyFilters() {
  store.setFilterParams(filters.value);
}
function viewCard(id: string) { router.push(`/si/${id}`); }
function openAddForm() { formRef.value?.open(); }
function editItem(item: any) { formRef.value?.open(item); }
async function deleteItem(id: string) {
  const ok = await confirmDialog.value?.show('Списание', 'Списать СИ?');
  if (ok) await store.writeOffInstrument(id);
}
function refresh() { store.fetchInstruments(); }
function exportData() { /* будет позже */ }

onMounted(() => {
  store.fetchInstruments();
});
</script>