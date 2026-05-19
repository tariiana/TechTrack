export interface Subsystem {
  subsys_id: number;
  name: string;
  parent_id: number | null;
  location?: string;
  note?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface SubsystemPlan {
  plan_id: number;
  subsystem_id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// Тип для модуля
export interface Module {
  id: string;
  name: string;
  icon: string;
  order: number;
}

// Тип для элемента содержимого модуля
export interface ModuleContent {
  id: number;
  moduleId: string;
  entityId: number;
  name: string;
  status?: string;
  type: string;
}