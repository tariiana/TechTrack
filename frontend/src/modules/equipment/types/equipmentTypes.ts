export interface EquipmentNode {
  id: number;
  name: string;
  type: 'aggregate' | 'block';
  parentId?: number | null;
  subsystem?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  inventoryNumber?: string;
  isSI?: boolean;
  condition?: string;
  resource?: string;
  location?: string;
  note?: string;
  parameters?: string;               // <- новое поле
  characteristics?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface Resource {
  id: number;
  nodeId: number;
  name: string;
  value: string | number;
  unit?: string;
  updatedAt: string;
}
export interface NodeType {
  id: number;
  name: string;
  characteristicsTemplate: Record<string, any>;
  allowedChildTypeIds?: number[]; // ID видов, которые можно устанавливать
  createdAt: string;
  updatedAt: string;
}