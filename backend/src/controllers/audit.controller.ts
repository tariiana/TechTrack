import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { getAuditLog, getEntityAuditHistory } from '../services/audit.service.js';

export async function getAuditLogController(req: AuthenticatedRequest, res: Response) {
  try {
    const user_id = req.query.user_id as string;
    const entity_type = req.query.entity_type as string;
    const start_date = req.query.start_date as string;
    const end_date = req.query.end_date as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    const logs = await getAuditLog({
      user_id: user_id || undefined,
      entity_type: entity_type || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      limit,
      offset,
    });
    
    res.json(logs);
  } catch (error: any) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

export async function getEntityAuditHistoryController(req: AuthenticatedRequest, res: Response) {
  try {
    // Простое приведение к строке
    const entityType = req.params.entityType as string;
    const entityId = req.params.entityId as string;
    
    const history = await getEntityAuditHistory(entityType, entityId);
    
    res.json(history);
  } catch (error: any) {
    console.error('Get entity audit history error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}