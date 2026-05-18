<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content" style="width: 900px; max-height: 100vh; overflow-y: auto;">
      <div class="modal-header">График нагрузки ТО по месяцам</div>
      
      <!-- Контейнер для графика и экспорта     -->
      <div ref="chartContainer" class="chart-container">
        <div class="chart-header-info">
          <h3>{{ planName }}</h3>
          <p>Период: {{ planPeriod }}</p>
        </div>
        <canvas ref="chartCanvas" class="chart-canvas"></canvas>
        <div class="chart-summary" v-if="summaryData.length">
            <h4>Сводка по месяцам:</h4>
            <ul>
                <li v-for="item in summaryData" :key="item.month">
                <strong>{{ item.month }}:</strong>
                <template v-for="(count, type) in item.types" :key="type">
                    <span v-if="count > 0" :style="{ color: getColorForType(String(type)), marginLeft: '8px' }">
                    {{ type }}: {{ count }}
                    </span>
                </template>
                </li>
            </ul>
        </div>
      </div>
      
      <div class="modal-footer">
        <div class="export-buttons">
          <button class="btn btn-secondary" @click="exportAsPNG">📸 Сохранить как PNG</button>
          <button class="btn btn-secondary" @click="exportAsPDF">📄 Сохранить как PDF</button>
        </div>
        <button class="btn btn-primary" @click="close">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const props = defineProps<{
  planName: string;
  planPeriod: string;
  tasks: any[];
}>();

const visible = ref(false);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartContainer = ref<HTMLElement | null>(null);
let chartInstance: any = null;
const summaryData = ref<any[]>([]);

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const serviceTypes = ['плановое ТО', 'внеплановое ТО', 'капитальный ремонт', 'текущий ремонт', 'аварийный ремонт', 'модернизация'];

const typeColors: Record<string, string> = {
  'плановое ТО': '#2c5f8a',
  'внеплановое ТО': '#e67e22',
  'капитальный ремонт': '#27ae60',
  'текущий ремонт': '#3498db',
  'аварийный ремонт': '#c0392b',
  'модернизация': '#8e44ad'
};

function getColorForType(type: string): string {
  return typeColors[type] || '#999';
}

function prepareChartData(tasks: any[]) {
  const monthlyData: Record<number, Record<string, number>> = {};
  
  for (let i = 1; i <= 12; i++) {
    monthlyData[i] = {};
    for (const type of serviceTypes) {
      const monthRecord = monthlyData[i];
      if (monthRecord) {
        monthRecord[type] = 0;
      }
    }
  }
  
  for (const task of tasks) {
    if (task.recommendedDate) {
      const month = new Date(task.recommendedDate).getMonth() + 1;
      const type = task.serviceType;
      const monthRecord = monthlyData[month];
      if (monthRecord && monthRecord[type] !== undefined) {
        monthRecord[type]++;
      }
    }
  }
  
  const datasets = serviceTypes.map(type => ({
    label: type,
    data: monthNames.map((_, idx) => {
      const monthData = monthlyData[idx + 1];
      return monthData ? (monthData[type] || 0) : 0;
    }),
    backgroundColor: getColorForType(type),
    borderColor: getColorForType(type),
    borderWidth: 1,
    stack: 'stack0'
  }));
  
  summaryData.value = [];
  for (let i = 0; i < monthNames.length; i++) {
    const month = monthNames[i];
    const monthData = monthlyData[i + 1];
    if (monthData) {
      const hasData = Object.values(monthData).some(v => v > 0);
      if (hasData) {
        summaryData.value.push({ month, types: monthData });
      }
    }
  }
  
  return { labels: monthNames, datasets };
}

async function renderChart() {
  if (!chartCanvas.value) return;
  
  const { labels, datasets } = prepareChartData(props.tasks);
  
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;
  
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { 
          position: 'top',
          labels: {
            font: { size: 12 }
          }
        },
        tooltip: { 
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${context.raw} ТО`
          },
          bodyFont: { size: 12 },
          titleFont: { size: 13 }
        }
      },
      scales: {
        x: { 
          stacked: true,
          title: { 
            display: true, 
            text: 'Месяцы',
            font: { size: 13, weight: 'bold' }
          },
          ticks: { font: { size: 11 } }
        },
        y: { 
          stacked: true,
          beginAtZero: true, 
          title: { 
            display: true, 
            text: 'Количество ТО',
            font: { size: 13, weight: 'bold' }
          },
          ticks: { stepSize: 1, precision: 0, font: { size: 11 } }
        }
      }
    }
  });
}

async function exportAsPNG() {
  if (!chartContainer.value) return;
  
  try {
    const canvas = await html2canvas(chartContainer.value, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    
    const link = document.createElement('a');
    link.download = `${props.planName.replace(/\s/g, '_')}_график_ТО.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (error) {
    console.error('Ошибка экспорта PNG:', error);
    alert('Ошибка при создании изображения');
  }
}

async function exportAsPDF() {
  if (!chartContainer.value) return;
  
  try {
    // Временно убираем ограничения по высоте для полного захвата
    const originalHeight = chartCanvas.value?.style.height;
    if (chartCanvas.value) {
      chartCanvas.value.style.height = 'auto';
    }
    
    // Создаём canvas с полным захватом
    const canvas = await html2canvas(chartContainer.value, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (clonedDoc, element) => {
        // В клоне тоже убираем ограничения
        const clonedCanvas = clonedDoc.querySelector('.chart-canvas');
        if (clonedCanvas) {
          (clonedCanvas as HTMLElement).style.height = 'auto';
        }
      }
    });
    
    // Возвращаем оригинальную высоту
    if (chartCanvas.value && originalHeight) {
      chartCanvas.value.style.height = originalHeight;
    }
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Рассчитываем размеры с сохранением пропорций
    let imgWidth = pdfWidth - 10;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Если высота больше страницы, уменьшаем
    if (imgHeight > pdfHeight - 10) {
      imgHeight = pdfHeight - 10;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    
    // Центрируем
    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`${props.planName.replace(/\s/g, '_')}_график_ТО.pdf`);
  } catch (error) {
    console.error('Ошибка экспорта PDF:', error);
    alert('Ошибка при создании PDF');
  }
}

function open() {
  visible.value = true;
  nextTick(() => {
    renderChart();
  });
}

function close() {
  visible.value = false;
}

defineExpose({ open });
</script>

<style scoped>
.chart-container {
  padding: 20px;
  background: white;
  border-radius: 8px;
  overflow: visible !important;
}

.chart-canvas {
  width: 100%;
  height: auto !important;
  min-height: 350px;
}

.chart-header-info {
  text-align: center;
  margin-bottom: 20px;
}

.chart-header-info h3 {
  margin: 0 0 5px 0;
  color: #2c5f8a;
  font-size: 18px;
}

.chart-header-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.chart-summary {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.chart-summary h4 {
  margin: 0 0 10px 0;
  color: #2c5f8a;
  font-size: 16px;
}

.chart-summary ul {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chart-summary li {
  background: white;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #e0e4e8;
  font-size: 14px;
}

.legend {
  display: flex;
  gap: 15px;
  margin-right: 20px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

.legend-color {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.export-buttons {
  display: flex;
  gap: 10px;
}
</style>