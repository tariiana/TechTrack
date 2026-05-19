<template>
  <div class="chart-container" v-if="parameters.length">
    <div class="chart-header">
      <h4>Динамика изменения ресурса</h4>
      <select v-model="selectedParamId" class="form-control chart-select">
        <option :value="null" disabled>-- Выберите параметр --</option>
        <option v-for="p in availableParams" :key="p.id" :value="p.id">
          {{ p.name }} ({{ p.unit }})
        </option>
      </select>
    </div>
    <canvas ref="chartCanvas" class="chart-canvas"></canvas>
    <div v-if="!hasData" class="chart-empty">
      Нет данных для отображения графика
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps<{
  parameters: any[];
}>();

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: any = null;
const selectedParamId = ref<number | null>(null);
const hasData = ref(false);

const availableParams = computed(() => props.parameters.filter(p => 
  p.name === 'Емкость' || p.name === 'Напряжение' || p.name === 'Внутреннее сопротивление'
));

const getMockHistory = (paramName: string) => {
  const histories: Record<string, { labels: string[]; values: number[] }> = {
    'Емкость': { labels: ['Янв', 'Мар', 'Май', 'Июл', 'Сен', 'Ноя'], values: [95, 92, 88, 85, 82, 80] },
    'Напряжение': { labels: ['Янв', 'Мар', 'Май', 'Июл', 'Сен', 'Ноя'], values: [12.5, 12.4, 12.3, 12.2, 12.1, 12.0] },
    'Внутреннее сопротивление': { labels: ['Янв', 'Мар', 'Май', 'Июл', 'Сен', 'Ноя'], values: [0.018, 0.019, 0.020, 0.022, 0.024, 0.026] }
  };
  return histories[paramName] || { labels: [], values: [] };
};

async function renderChart() {
  if (!chartCanvas.value || !selectedParamId.value) return;
  const param = props.parameters.find(p => p.id === selectedParamId.value);
  if (!param) return;

  const history = getMockHistory(param.name);
  if (history.labels.length === 0) { hasData.value = false; return; }
  hasData.value = true;

  try {
    const { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } = await import('chart.js');
    Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
    if (chartInstance) chartInstance.destroy();

    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.labels,
        datasets: [{
          label: `${param.name} (${param.unit})`,
          data: history.values,
          borderColor: '#2c5f8a',
          backgroundColor: 'rgba(44, 95, 138, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#2c5f8a',
          pointBorderColor: '#fff',
          pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' }, tooltip: { mode: 'index' } },
        scales: { y: { beginAtZero: false, title: { display: true, text: param.unit } } }
      }
    });
  } catch (error) {
    console.error('Chart error:', error);
  }
}

watch(selectedParamId, () => renderChart());
onMounted(() => {
  if (availableParams.value.length) selectedParamId.value = availableParams.value[0].id;
});
</script>

<style scoped>
.chart-container { margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e0e4e8; }
.chart-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; flex-wrap: wrap; }
.chart-select { width: 200px; }
.chart-canvas { width: 100%; height: 300px; min-height: 300px; }
.chart-empty { text-align: center; padding: 60px 20px; color: #999; }
</style>