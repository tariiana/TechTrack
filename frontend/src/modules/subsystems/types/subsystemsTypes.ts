export interface Subsystem {
  id: number
  name: string
  parentId: number | null
  description?: string
  location?: string
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

export interface SubsystemPlan {
  id: number
  subsystemId: number
  name: string
  description?: string
  startDate: string
  endDate: string
  status: 'pending' | 'in_progress' | 'completed'
  createdAt: string
  updatedAt: string
  isDeleted: boolean
}

// Тип для модуля
export interface Module {
  id: string
  name: string
  icon: string
  order: number
}

// Тип для элемента содержимого модуля
export interface ModuleContent {
  id: number
  moduleId: string
  entityId: number
  name: string
  status?: string
  type: string
}
