export interface MaintenancePlan {
  id: number
  name: string // Название плана-графика
  startDate: string // Дата начала (YYYY-MM-DD)
  endDate: string // Дата окончания
  description?: string
  createdAt: string
  updatedAt: string
  isDeleted: boolean
  subsystemId: number
}

export interface MaintenanceTask {
  id: number
  planId: number // ID плана-графика
  nodeId: number // ID агрегата
  nodeName: string // Наименование агрегата
  nodeLocation?: string // Местоположение
  recommendedDate: string // Рекомендуемая дата ТО
  serviceType:
    | 'плановое ТО'
    | 'внеплановое ТО'
    | 'капитальный ремонт'
    | 'аварийный ремонт'
    | 'модернизация'
    | 'текущий ремонт'
  status: 'pending' | 'in_progress' | 'completed' | 'not_completed'
  completedDate?: string
  notes?: string
}
