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

export interface SubsystemNode {
  node_id: string;
  name: string | null;
  manufacturer: string;
  model: string;
  serial_number: string | null;
  inventory_number: string | null;
  status: string;
  location: string;
  node_type_name: string | null;
  is_aggregate: boolean;
}

export interface SubsystemPayload {
  name: string;
  location: string;
  parent_id: string | null;
  note?: string | null;
}
