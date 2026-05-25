export interface Resource {
  resource_id: number;
  node_id: number;
  node_name?: string;
  name: string;
  mark?: string;
  type?: string;
  production_date?: string;
  registration_date: string;
  registration_number?: number;
  service_life?: number;
  time_to_service?: number;
  initial_resource?: string;
  remaining_resource?: string;
  installed_in?: string;
  resource_params?: Record<string, any>;
  note?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
   status?: string;
}

export interface ResourceParameter {
  id: number;
  resourceId: number;
  name: string;      // Отображаемое имя
  key: string;       // Ключ для хранения (U, R, C, E)
  value: string | number;
  unit: string;
  isMain: boolean;
}

export interface ResourceMeasurement {
  measurement_id: number;
  resource_id: number;
  node_id: number;
  node_name?: string;
  resource_name?: string;
  mark?: string;
  registration_number?: number;
  measurement_date: string;
  parameters: Record<string, any>;
  created_at: string;
}

export interface ResourceAlert {
  alert_id: number;
  resource_id: number;
  node_id: number;
  threshold: number;
  message: string;
  is_active: boolean;
  created_at: string;
}