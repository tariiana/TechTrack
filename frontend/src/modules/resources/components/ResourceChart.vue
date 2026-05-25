<template>
  <div class="chart-container" v-if="hasData">
    <div class="chart-header">
      <h4>Динамика изменения ресурса</h4>
      <select v-model="selectedParam" class="form-control chart-select">
        <option value="U">Напряжение (U), В</option>
        <option value="R">Сопротивление (R), Ом</option>
        <option value="E">Ёмкость (E), Втч</option>
        <option value="C">Ёмкость (C), мАч</option>
      </select>
    </div>
    <canvas ref="chartCanvas" class="chart-canvas"></canvas>
  </div>
  <div v-else class="chart-empty">
    Нет данных для отображения графика
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useResourcesStore } from '../stores/resourcesStore';

const props = defineProps<{
  resourceId: number | string;
}>();

const store = useResourcesStore();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: any = null;
const selectedParam = ref('U');
const hasData = ref(false);
const measurements = ref<any[]>([]);
let chartKey = ref(0);

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function getChartValue(parameters: Record<string, any>, key: string): number | null {
  const aliases: Record<string, string[]> = {
    U: ['U', 'voltage'],
    R: ['R', 'resistance'],
    E: ['E', 'capacity'],
    C: ['C', 'capacity'],
  };

  for (const alias of aliases[key] || [key]) {
    const value = parameters?.[alias];
    const raw = value && typeof value === 'object' && !Array.isArray(value) && 'value' in value
      ? value.value
      : value;
    if (raw !== null && raw !== undefined && raw !== '') {
      const number = Number(raw);
      if (Number.isFinite(number)) return number;
    }
  }

  return null;
}

async function loadMeasurements() {
  measurements.value = store.getMeasurementsForResource(props.resourceId);
  await renderChart();
}

async function renderChart() {
  if (!chartCanvas.value) return;
  
  const sorted = [...measurements.value].sort((a, b) => 
    new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
  );
  
  const points = sorted
    .map(m => ({
      label: formatDate(m.measurementDate),
      value: getChartValue(m.parameters || {}, selectedParam.value),
    }))
    .filter(point => point.value !== null);
  const labels = points.map(point => point.label);
  const data = points.map(point => point.value);
  
  if (labels.length === 0) {
    hasData.value = false;
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }
  
  hasData.value = true;
  const label = selectedParam.value === 'U' ? 'Напряжение (В)' :
                selectedParam.value === 'R' ? 'Сопротивление (Ом)' :
                selectedParam.value === 'E' ? 'Ёмкость (Втч)' : 'Ёмкость (мАч)';

  try {
    const { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } = await import('chart.js');
    Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
    
    if (chartInstance) chartInstance.destroy();
    
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;
    
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: '#2c5f8a',
          backgroundColor: 'rgba(44,95,138,0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: '#2c5f8a',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { mode: 'index', intersect: false },
          legend: { position: 'top' }
        },
        scales: {
          y: { title: { display: true, text: selectedParam.value === 'U' ? 'В' : selectedParam.value === 'R' ? 'Ом' : 'Втч/мАч' } }
        }
      }
    });
  } catch (error) {
    console.error('Chart error:', error);
  }
}

watch(selectedParam, () => renderChart());
watch(() => props.resourceId, () => loadMeasurements(), { immediate: true });
watch(() => measurements.value, () => renderChart(), { deep: true });
</script>

<style scoped>
/* Уникальные стили графика (нет в глобальных) */
.chart-container {
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e4e8;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.chart-select {
  width: 250px;
}

.chart-canvas {
  width: 100%;
  height: 300px;
  min-height: 300px;
}

.chart-empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}
</style>
