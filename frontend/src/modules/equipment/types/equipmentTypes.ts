export interface EquipmentNode {
  node_id: number;
  name: string;
  type: 'aggregate' | 'block';
  parent_id?: number | null;
  subsystem_id?: number;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  inventory_number?: string;
  is_si?: boolean;
  status?: string;
  location?: string;
  note?: string;
  parameters?: Record<string, any>;
  characteristics?: Record<string, any>;
  operation_mode?: string;
  commission_date?: string;
  installed_in_node?: number | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Resource {
  resource_id: number;
  node_id: number;
  name: string;
  value: string | number;
  unit?: string;
  registration_date: string;
  resource_params: Record<string, any>;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface NodeType {
  node_type_id: number;
  name: string;
  characteristics_template: Record<string, any>;
  allowed_child_type_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface MovementHistory {
  history_id: number;
  node_id: number;
  from_location?: string;
  to_location: string;
  created_at: string;
  user_name?: string;
}