import { Request } from 'express';

export interface JWTPayload {
  user_id: string;
  login: string;
  role: string;
  full_name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export interface User {
  user_id: string;
  login: string;
  password_hash: string;
  role_id: string;
  full_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Node {
  node_id: string;
  node_type_id: string;
  name: string;
  manufacturer: string;
  model: string;
  manufactured_date: string | null;
  serial_number: string | null;
  inventory_number: string | null;
  registration_number: string | null;
  status: string;
  commission_date: string | null;
  operation_mode: number | null;
  decommission_date: string | null;
  write_off_date: string | null;
  location: string;
  parameters: any;
  note: string | null;
  installed_in_node: string | null;
  subsystem_id: string;
}

export interface Subsystem {
  subsys_id: string;
  parent_id: string | null;
  name: string;
  location: string;
  note: string | null;
}

export interface MeasuringInstrument {
  instrument_id: string;
  name: string;
  manufacturer: string;
  model: string;
  serial_number: string | null;
  inventory_number: string | null;
  tab_number: string;
  status: string;
  calibration_date: string | null;
  calibration_interval: number;
  next_calibration_date: string | null;
  location: string;
  note: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CalibrationHistory {
  history_id: string;
  instrument_id: string;
  calibration_date: string;
  next_calibration_date: string | null;
  calibrator: string;
  certificate_number: string | null;
  result: string;
  notes: string | null;
  performed_at: Date;
}

export interface Resource {
  resource_id: string;
  node_id: string;
  registration_date: string;
  resource_params: any;
  note: string | null;
}

export interface MaintenancePlan {
  plan_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Maintenance {
  maintenance_id: string;
  node_id: string;
  completed_date: string | null;
  type_id: number;
  status_id: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface MaintenanceItem {
  item_id: string;
  plan_id: string;
  maintenance_id: string;
  created_at: Date;
}

export interface AuditLog {
  log_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  user_agent: string | null;
  performed_at: Date;
}

export interface JWTPayload {
  user_id: string;
  login: string;
  role: string;
  full_name: string;
}
