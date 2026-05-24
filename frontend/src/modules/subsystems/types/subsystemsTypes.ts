export type SubsystemContentType = 'equipment' | 'instrument' | 'resource' | 'maintenance' | 'plan';

export interface Subsystem {
  subsys_id: string;
  name: string;
  parent_id: string | null;
  location: string;
  note?: string;
}

export interface SubsystemTreeItem extends Subsystem {
  children: SubsystemTreeItem[];
}

export interface SubsystemTreeNode {
  id: string;
  name: string;
  type: 'subsystem';
  children: SubsystemTreeNode[];
}

export interface SubsystemPayload {
  name: string;
  location: string;
  parent_id: string | null;
  note?: string | null;
}

export interface SubsystemContentItem {
  type: SubsystemContentType;
  id: string;
  node_id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  name?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  inventory_number?: string | null;
  registration_number?: string | null;
  status?: string | null;
  location?: string | null;
  subsystem_id?: string | null;
  subsystem_name?: string | null;
  current_subsystem_id?: string | null;
  current_subsystem_name?: string | null;
  node_type_name?: string | null;
  is_aggregate?: boolean;
  attachable?: boolean;
  [key: string]: unknown;
}

export interface SubsystemContent {
  subsystem: Subsystem;
  equipment: SubsystemContentItem[];
  instruments: SubsystemContentItem[];
  resources: SubsystemContentItem[];
  maintenance: SubsystemContentItem[];
  plans: SubsystemContentItem[];
  counts: {
    equipment: number;
    instruments: number;
    resources: number;
    maintenance: number;
    plans: number;
  };
}

export type SubsystemNode = SubsystemContentItem;
