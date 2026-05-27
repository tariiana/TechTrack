// @ts-ignore CommonJS model is used by the active Express routes.
import Resource from '../models/Resource.js';
import { auditLog } from '../middleware/audit.js';

// Тонкая TypeScript-обертка над CommonJS-моделью Resource. Нужна там, где
// контроллеры хотят аудит со старыми/новыми данными.
type ResourceFilters = {
  node_id?: string;
  search?: string;
};

type ResourcePayload = {
  node_id?: string;
  registration_date?: string;
  resource_params?: Record<string, any>;
  note?: string | null;
  [key: string]: any;
};

export async function getAllResources(filters?: ResourceFilters) {
  return Resource.getAll(filters || {});
}

export async function getResourceById(resourceId: string) {
  return Resource.getById(resourceId);
}

export async function getResourcesForNode(nodeId: string) {
  return Resource.getAll({ node_id: nodeId });
}

export async function createResource(
  data: ResourcePayload & { node_id: string },
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  // Модель делает upsert по node_id; после записи перечитываем ресурс, чтобы
  // аудит получил нормализованный DTO.
  const result = await Resource.upsert(data.node_id, data, userId);
  const newResource = await Resource.getById(data.node_id);

  await auditLog(userId, 'CREATE_RESOURCE', 'resource', result.resource_id, null, newResource, ipAddress, userAgent);

  return newResource || result;
}

export async function updateResource(
  resourceId: string,
  data: ResourcePayload,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const oldData = await Resource.getById(resourceId);
  if (!oldData) throw new Error('Resource not found');

  await Resource.upsert(resourceId, data, userId);
  const newData = await Resource.getById(resourceId);

  await auditLog(userId, 'UPDATE_RESOURCE', 'resource', resourceId, oldData, newData, ipAddress, userAgent);

  return newData;
}

export async function deleteResource(
  resourceId: string,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  const oldData = await Resource.getById(resourceId);
  if (!oldData) throw new Error('Resource not found');

  await Resource.delete(resourceId);

  await auditLog(userId, 'DELETE_RESOURCE', 'resource', resourceId, oldData, null, ipAddress, userAgent);

  return oldData;
}

export async function calculateResource(nodeId: string, workHoursPerYear: number) {
  return Resource.calculate(nodeId, workHoursPerYear);
}
