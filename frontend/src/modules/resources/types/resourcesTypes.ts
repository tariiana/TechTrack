export interface Resource {
  id: number;
  nodeId: number;
  nodeName?: string;
  name: string;
  mark?: string;              // Марка
  type?: string;              // Тип
  productionDate?: string;    // Дата производства
  registrationDate: string;   // Дата регистрации
  registrationNumber?: number; // Учётный номер
  serviceLife?: number;        // Срок службы (лет)
  lastServiceDate?: string;    // Дата последнего ТО
  timeToService?: number;      // Срок до ТО (лет)
  initialResource?: string;    // Исходный ресурс
  remainingResource?: string;  // Остаточный ресурс
  installedIn?: string;        // Установлен в
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface ResourceParameter {
  id: number;
  resourceId: number;
  name: string;
  value: string | number;
  unit: string;
  isMain: boolean;
}

export interface ResourceMeasurement {
  id: number;
  resourceId: number;
  nodeId: number;
  nodeName?: string;
  resourceName?: string;
  mark?: string;
  registrationNumber?: number;
  measurementDate: string;
  parameters: Record<string, any>; // JSON параметров измерения
  createdAt: string;
}

export interface ResourceAlert {
  id: number;
  resourceId: number;
  nodeId: number;
  threshold: number;
  message: string;
  isActive: boolean;
}