<template>
  <div class="card" v-if="instrument">
    <div style="display: flex; justify-content: space-between">
      <h2>{{ instrument.name }}</h2>
      <div>
        <button class="btn btn-secondary" @click="goBack">← Назад</button>
        <button v-if="canEdit" class="btn btn-primary" @click="editItem">Редактировать</button>
      </div>
    </div>
    <table style="width: 100%">
      <tr><td style="width: 200px"><strong>Таб. номер:</strong></td><td>{{ instrument.tab_number }}</td></tr>
      <tr><td><strong>Статус:</strong></td><td>{{ instrument.status }}</td></tr>
      <tr><td><strong>Межповерочный интервал:</strong></td><td>{{ instrument.calibration_interval }} лет</td></tr>
      <tr><td><strong>Последняя поверка:</strong></td><td>{{ formatDate(instrument.calibration_date) }}</td></tr>
      <tr><td><strong>Следующая поверка:</strong></td><td>{{ formatDate(instrument.next_calibration_date) }}</td></tr>
      <tr><td><strong>Местоположение:</strong></td><td>{{ instrument.location }}</td></tr>
      <tr><td><strong>Примечания:</strong></td><td>{{ instrument.note }}</td></tr>
    </table>

    <h3>История поверок</h3>
    <table class="data-table">
      <thead><tr><th>Дата поверки</th><th>Поверитель</th><th>Результат</th></tr></thead>
      <tbody>
        <tr v-for="h in history" :key="h.history_id">
          <td>{{ formatDate(h.calibration_date) }}</td>
          <td>{{ h.calibrator }}</td>
          <td>{{ h.result }}</td>
        </tr>
      </tbody>
    </table>

    <SIForm ref="formRef" @saved="refresh" />
  </div>
  <div v-else>Загрузка...</div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSIStore } from '../stores/siStore';
import SIForm from '../components/SIForm.vue';
import { formatDate } from '@/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const store = useSIStore();
const formRef = ref();
const instrument = ref<any>(null);
const history = ref<any[]>([]);

const canEdit = computed(() => {
  const user = localStorage.getItem('user');
  if (!user) return false;
  try {
    const role = JSON.parse(user).role;
    return role === 'operator' || role === 'admin';
  } catch {
    return false;
  }
});

async function loadData() {
  const id = route.params.id as string;
  instrument.value = await store.fetchInstrumentById(id);
  history.value = await store.fetchCalibrationHistory(id);
}
function goBack() { router.back(); }
function editItem() { formRef.value?.open(instrument.value); }
function refresh() { loadData(); }
onMounted(loadData);
</script>