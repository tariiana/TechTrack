<template>
  <div class="dashboard">
    <h1 class="dashboard-title">Панель управления</h1>
    <p class="dashboard-subtitle">
      Добро пожаловать в систему учёта и технического обслуживания оборудования
    </p>

    <div class="modules-grid">
      <!-- Блок Оборудование -->
      <div class="module-card" @click="goToModule('/equipment')">
        <div class="module-icon equipment-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <line x1="9" y1="4" x2="9" y2="20" />
            <line x1="15" y1="4" x2="15" y2="20" />
            <line x1="4" y1="9" x2="20" y2="9" />
            <line x1="4" y1="15" x2="20" y2="15" />
          </svg>
        </div>
        <h3>Оборудование</h3>
        <div class="module-stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.equipment.total }}</span>
            <span class="stat-label">Всего узлов</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.equipment.aggregates }}</span>
            <span class="stat-label">Агрегатов</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.equipment.blocks }}</span>
            <span class="stat-label">Блоков</span>
          </div>
        </div>
        <div class="module-footer">
          <span class="module-link">Перейти к оборудованию →</span>
        </div>
      </div>

      <!-- Блок СИ -->
      <div class="module-card" @click="goToModule('/si')">
        <div class="module-icon si-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h3>Средства измерения</h3>
        <div class="module-stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.si.total }}</span>
            <span class="stat-label">Всего СИ</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.si.expiringSoon }}</span>
            <span class="stat-label">Поверка <30 дней</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.si.expired }}</span>
            <span class="stat-label">Просрочено</span>
          </div>
        </div>
        <div class="module-footer">
          <span class="module-link">Перейти к СИ →</span>
        </div>
      </div>

      <!-- Блок Ресурсы -->
      <div class="module-card" @click="goToModule('/resources')">
        <div class="module-icon resources-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2v4M12 22v-4M4 12H2M6 12H4M20 12h-2M22 12h-2" />
            <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
            <path d="M16.5 7.5L19 5M7.5 16.5L5 19M16.5 16.5L19 19M7.5 7.5L5 5" />
          </svg>
        </div>
        <h3>Ресурсы</h3>
        <div class="module-stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.resources.total }}</span>
            <span class="stat-label">Всего ресурсов</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.resources.critical }}</span>
            <span class="stat-label">Критические</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.resources.warning }}</span>
            <span class="stat-label">Внимание</span>
          </div>
        </div>
        <div class="module-footer">
          <span class="module-link">Перейти к ресурсам →</span>
        </div>
      </div>

      <!-- Блок Обслуживание -->
      <div class="module-card" @click="goToModule('/maintenance')">
        <div class="module-icon maintenance-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h3>Обслуживание</h3>
        <div class="module-stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.maintenance.plansCount }}</span>
            <span class="stat-label">Планов ТО</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.maintenance.overdueTasks }}</span>
            <span class="stat-label">Просрочено</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.maintenance.nearTasks }}</span>
            <span class="stat-label">Скоро (<30 дн)</span>
          </div>
        </div>
        <div class="module-footer">
          <span class="module-link">Перейти к обслуживанию →</span>
        </div>
      </div>
    </div>

    <!-- Блок срочных уведомлений -->
    <div class="alerts-section" v-if="urgentAlerts.length > 0">
      <h3>⚠️ Срочные уведомления</h3>
      <div class="alerts-list">
        <div v-for="alert in urgentAlerts" :key="alert.id" class="alert-item" :class="alert.type">
          {{ alert.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEquipmentStore } from '@/modules/equipment/stores/equipmentStore'
import { useSIStore } from '@/modules/si/stores/siStore'
import { useResourcesStore } from '@/modules/resources/stores/resourcesStore'
import { useMaintenanceStore } from '@/modules/maintenance/stores/maintenanceStore'

const router = useRouter()
const equipmentStore = useEquipmentStore()
const siStore = useSIStore()
const resourcesStore = useResourcesStore()
const maintenanceStore = useMaintenanceStore()

const stats = ref({
  equipment: { total: 0, aggregates: 0, blocks: 0 },
  si: { total: 0, expiringSoon: 0, expired: 0 },
  resources: { total: 0, critical: 0, warning: 0 },
  maintenance: { plansCount: 0, overdueTasks: 0, nearTasks: 0 },
})

const urgentAlerts = ref<{ id: string; type: string; message: string }[]>([])

function goToModule(path: string) {
  router.push(path)
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 3600 * 24))
}

async function loadStats() {
  // Оборудование
  await equipmentStore.fetchNodes()
  const nodes = equipmentStore.nodes || []
  stats.value.equipment.total = nodes.length
  stats.value.equipment.aggregates = nodes.filter((n: any) => n.type === 'aggregate').length
  stats.value.equipment.blocks = nodes.filter((n: any) => n.type === 'block').length

  // СИ
  await siStore.fetchInstruments()
  const instruments = siStore.instruments || []
  stats.value.si.total = instruments.length
  let expiringSoon = 0
  let expired = 0
  for (const si of instruments) {
    if (si.next_calibration_date) {
      const days = getDaysUntil(si.next_calibration_date)
      if (days < 0) expired++
      else if (days <= 30) expiringSoon++
    }
  }
  stats.value.si.expiringSoon = expiringSoon
  stats.value.si.expired = expired

  // Ресурсы
  await resourcesStore.fetchResources()
  const resources = resourcesStore.resources || []
  stats.value.resources.total = resources.length
  let criticalCount = 0
  let warningCount = 0
  for (const res of resources) {
    // Проверяем ресурсы на критичность (например, остаточный ресурс < 10%)
    const params = res.resource_params || {}
    const remaining = params.remainingPercent || params.remainingResource || 100
    if (remaining < 10) criticalCount++
    else if (remaining < 30) warningCount++
  }
  stats.value.resources.critical = criticalCount
  stats.value.resources.warning = warningCount

  // Обслуживание
  await maintenanceStore.fetchPlans()
  const plans = maintenanceStore.plans || []
  stats.value.maintenance.plansCount = plans.length
  // Загрузим задачи, чтобы посчитать просроченные и ближайшие
  await maintenanceStore.fetchTasks()
  const tasks = maintenanceStore.tasks || []
  let overdueTasks = 0
  let nearTasks = 0
  for (const task of tasks) {
    if (task.recommended_date) {
      const days = getDaysUntil(task.recommended_date)
      if (days < 0) overdueTasks++
      else if (days <= 30) nearTasks++
    }
  }
  stats.value.maintenance.overdueTasks = overdueTasks
  stats.value.maintenance.nearTasks = nearTasks

  // Срочные уведомления
  urgentAlerts.value = []
  for (const si of instruments) {
    if (si.next_calibration_date && getDaysUntil(si.next_calibration_date) < 0) {
      urgentAlerts.value.push({
        id: si.instrument_id,
        type: 'danger',
        message: `СИ "${si.name}" (${si.tab_number}): поверка просрочена!`,
      })
    }
  }
  for (const res of resources) {
    const params = res.resource_params || {}
    if (params.remainingPercent && params.remainingPercent < 10) {
      urgentAlerts.value.push({
        id: res.resource_id,
        type: 'danger',
        message: `Ресурс "${res.node_name || 'оборудования'}": критическое состояние!`,
      })
    }
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
/* все стили остаются без изменений — они уже есть в вашем оригинале */
.dashboard {
  max-width: 1400px;
  margin: 0 auto;
}
.dashboard-title {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 8px;
}
.dashboard-subtitle {
  color: #6c757d;
  margin-bottom: 32px;
}
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}
.module-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e0e4e8;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  border-color: #2c5f8a;
}
.module-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.equipment-icon {
  background-color: #e3f2fd;
  color: #1565c0;
}
.si-icon {
  background-color: #e8f5e9;
  color: #2e7d32;
}
.resources-icon {
  background-color: #fff3e0;
  color: #e65100;
}
.maintenance-icon {
  background-color: #fce4ec;
  color: #c62828;
}
.module-card h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #2c3e50;
}
.module-stats {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.stat-item {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  background: #f8f9fa;
  border-radius: 8px;
}
.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #2c5f8a;
}
.stat-label {
  display: block;
  font-size: 11px;
  color: #6c757d;
  margin-top: 4px;
}
.module-footer {
  text-align: right;
  border-top: 1px solid #e0e4e8;
  padding-top: 12px;
}
.module-link {
  font-size: 13px;
  color: #2c5f8a;
  font-weight: 500;
}
.module-card:hover .module-link {
  text-decoration: underline;
}
.alerts-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e0e4e8;
}
.alerts-section h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #c0392b;
}
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.alert-item {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}
.alert-item.danger {
  background-color: #ffe0e0;
  border-left: 4px solid #c0392b;
  color: #c0392b;
}
.alert-item.warning {
  background-color: #fff3e0;
  border-left: 4px solid #e67e22;
  color: #e67e22;
}
@media (max-width: 768px) {
  .modules-grid {
    grid-template-columns: 1fr;
  }
  .module-stats {
    flex-wrap: wrap;
  }
  .stat-item {
    min-width: 80px;
  }
}
</style>