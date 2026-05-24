<template>
  <div class="modal-overlay" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">График нагрузки ТО по месяцам</div>
      
      <!-- Прокручиваемая область (всё кроме кнопок) -->
      <div class="modal-scrollable">
        <div ref="chartContainer" class="chart-container">
          <div class="chart-header-info">
            <h3>{{ planName }}</h3>
            <p>Период: {{ planPeriod }}</p>
          </div>
          
          <canvas ref="chartCanvas" class="chart-canvas"></canvas>
          
          <!-- Легенда статуса выполнения -->
          <div class="status-legend" style="background-color: white;">
            <div class="status-legend-item">
              <div class="status-color solid"></div>
              <span>— не выполнено</span>
            </div>
            <div class="status-legend-item">
              <div class="status-color hatched"></div>
              <span>— выполнено</span>
            </div>
          </div>
          
          <!-- Сводка без прокрутки -->
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
      </div>
      
      <!-- Закрепленные кнопки внизу -->
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
import { showToast } from '@/utils/toast';
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

function createHatchPattern(ctx: CanvasRenderingContext2D, baseColor: string): CanvasPattern {
  const patternSize = 10;
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = patternSize;
  patternCanvas.height = patternSize;
  const patternCtx = patternCanvas.getContext('2d')!;
  
  patternCtx.fillStyle = baseColor;
  patternCtx.fillRect(0, 0, patternSize, patternSize);
  
  patternCtx.beginPath();
  patternCtx.moveTo(0, 0);
  patternCtx.lineTo(patternSize, patternSize);
  patternCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  patternCtx.lineWidth = 1.5;
  patternCtx.stroke();
  
  return patternCtx.createPattern(patternCanvas, 'repeat')!;
}

function prepareChartData(tasks: any[]) {
  const pendingMonthlyData: Record<number, Record<string, number>> = {};
  const completedMonthlyData: Record<number, Record<string, number>> = {};
  
  // Инициализация
  for (let i = 1; i <= 12; i++) {
    pendingMonthlyData[i] = {};
    completedMonthlyData[i] = {};
    for (const type of serviceTypes) {
      const pendingMonth = pendingMonthlyData[i];
      const completedMonth = completedMonthlyData[i];
      if (pendingMonth && completedMonth) {
        pendingMonth[type] = 0;
        completedMonth[type] = 0;
      }
    }
  }
  
  for (const task of tasks) {
    const dateStr = task.completed_date;
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const month = date.getMonth() + 1;
        const type = task.service_type;
        
        if (task.status_name === 'completed') {
          if (completedMonthlyData[month] && completedMonthlyData[month][type] !== undefined) {
            completedMonthlyData[month][type]++;
          }
        } else {
          if (pendingMonthlyData[month] && pendingMonthlyData[month][type] !== undefined) {
            pendingMonthlyData[month][type]++;
          }
        }
      }
    }
  }
  
  const datasets: any[] = [];
  
  for (const type of serviceTypes) {
    // Невыполненные (сплошной цвет)
    datasets.push({
      label: type,
      data: monthNames.map((_, idx) => {
        const monthData = pendingMonthlyData[idx + 1];
        return monthData ? (monthData[type] || 0) : 0;
      }),
      backgroundColor: getColorForType(type),
      borderColor: getColorForType(type),
      borderWidth: 1,
      stack: type,
      isCompleted: false,
      barPercentage: 0.7,
      categoryPercentage: 0.9
    });
    
    // Выполненные (штриховка) – добавляем только если есть данные
    const hasCompleted = monthNames.some((_, idx) => {
      const monthData = completedMonthlyData[idx + 1];
      return monthData ? (monthData[type] || 0) > 0 : false;
    });
    if (hasCompleted) {
      datasets.push({
        label: type,
        data: monthNames.map((_, idx) => {
          const monthData = completedMonthlyData[idx + 1];
          return monthData ? (monthData[type] || 0) : 0;
        }),
        backgroundColor: (context: any) => {
          if (context && context.chart && context.chart.ctx) {
            return createHatchPattern(context.chart.ctx, getColorForType(type));
          }
          return getColorForType(type);
        },
        borderColor: getColorForType(type),
        borderWidth: 1,
        stack: type,
        isCompleted: true,
        barPercentage: 0.7,
        categoryPercentage: 0.9
      });
    }
  }
  
  // Сводка
  summaryData.value = [];
  for (let i = 0; i < monthNames.length; i++) {
    const month = monthNames[i];
    const monthPending = pendingMonthlyData[i + 1];
    const monthCompleted = completedMonthlyData[i + 1];
    const totalTypes: Record<string, number> = {};
    
    for (const type of serviceTypes) {
      const pending = monthPending ? (monthPending[type] || 0) : 0;
      const completed = monthCompleted ? (monthCompleted[type] || 0) : 0;
      totalTypes[type] = pending + completed;
    }
    
    const hasData = Object.values(totalTypes).some(v => v > 0);
    if (hasData) {
      summaryData.value.push({ month, types: totalTypes });
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
            font: { size: 12 },
            filter: (legendItem, data) => {
              const idx = legendItem.datasetIndex;
              if (idx === undefined) return false;
              const dataset = data.datasets[idx];
              return (dataset as any)?.isCompleted === false;
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const datasetLabel = context.dataset.label || '';
              const value = context.raw || 0;
              const isCompleted = context.dataset.isCompleted;
              const status = isCompleted ? '(выполнено)' : '(не выполнено)';
              return `${datasetLabel} ${status}: ${value} ТО`;
            }
          },
          bodyFont: { size: 12 },
          titleFont: { size: 13 }
        }
      },
      scales: {
        x: {
          stacked: true,
          offset: true,
          grid: {
            offset: true,
          },
          title: { 
            display: true, 
            text: 'Месяцы', 
            font: { size: 13, weight: 'bold' } 
          },
          ticks: { 
            font: { size: 11 },
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Количество ТО',
            font: { size: 13, weight: 'bold' }
          },
          ticks: { 
            stepSize: 1, 
            precision: 0, 
            font: { size: 11 } 
          }
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
    showToast('График сохранён как PNG', 'success');
  } catch (error) {
    console.error('Ошибка экспорта PNG:', error);
    showToast('Ошибка при создании изображения', 'error');
  }
}

async function exportAsPDF() {
  if (!chartContainer.value) return;
  
  try {
    const originalHeight = chartCanvas.value?.style.height;
    if (chartCanvas.value) {
      chartCanvas.value.style.height = 'auto';
    }
    
    const canvas = await html2canvas(chartContainer.value, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
      onclone: (clonedDoc, element) => {
        const clonedCanvas = clonedDoc.querySelector('.chart-canvas');
        if (clonedCanvas) {
          (clonedCanvas as HTMLElement).style.height = 'auto';
        }
      }
    });
    
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
    
    let imgWidth = pdfWidth - 10;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    if (imgHeight > pdfHeight - 10) {
      imgHeight = pdfHeight - 10;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    
    const x = (pdfWidth - imgWidth) / 2;
    const y = (pdfHeight - imgHeight) / 2;
    
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    pdf.save(`${props.planName.replace(/\s/g, '_')}_график_ТО.pdf`);
    showToast('График сохранён как PDF', 'success');
  } catch (error) {
    console.error('Ошибка экспорта PDF:', error);
    showToast('Ошибка при создании PDF', 'error');
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
.modal-content {
  background: white;
  border-radius: 12px;
  width: 900px;
  max-width: 95%;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e4e8;
  flex-shrink: 0;
}

.modal-scrollable {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
  padding-right: 4px;
}

.modal-scrollable::-webkit-scrollbar {
  width: 8px;
}

.modal-scrollable::-webkit-scrollbar-track {
  background: #e0e4e8;
  border-radius: 4px;
}

.modal-scrollable::-webkit-scrollbar-thumb {
  background: #2c5f8a;
  border-radius: 4px;
}

.modal-scrollable::-webkit-scrollbar-thumb:hover {
  background: #1e4566;
}

.chart-container {
  padding: 12px;
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
  margin-bottom: 10px;
}

.chart-header-info h3 {
  margin: 0 0 3px 0;
  color: #2c5f8a;
  font-size: 18px;
}

.chart-header-info p {
  margin: 0;
  color: #666;
  font-size: 13px;
}

.status-legend {
  display: flex;
  justify-content: flex-start;
  gap: 20px;
  margin: 8px 0;
  padding: 5px 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.status-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #2c3e50;
}

.status-color {
  width: 24px;
  height: 16px;
  border-radius: 2px;
}

.status-color.solid {
  background-color: #2c5f8a;
}

.status-color.hatched {
  background: repeating-linear-gradient(
    45deg,
    #2c5f8a,
    #2c5f8a 2px,
    rgba(255, 255, 255, 0.5) 2px,
    rgba(255, 255, 255, 0.5) 5px
  );
}

.chart-summary {
  margin-top: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.chart-summary h4 {
  margin: 0;
  padding: 12px;
  color: #2c5f8a;
  font-size: 14px;
  border-bottom: 1px solid #e0e4e8;
}

.chart-summary ul {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 12px;
  list-style: none;
}

.chart-summary li {
  background: white;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #e0e4e8;
  font-size: 12px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e0e4e8;
  flex-shrink: 0;
}

.export-buttons {
  display: flex;
  gap: 10px;
}
</style>