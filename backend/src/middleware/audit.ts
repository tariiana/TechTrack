import { Request, Response, NextFunction } from 'express';
import { query } from '../config/db.js';
import { AuthenticatedRequest } from '../types/index.js';

export async function auditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  oldData: any | null,
  newData: any | null,
  ipAddress: string | null,
  userAgent: string | null
) {
  try {
    await query(
      `INSERT INTO equipment.audit_log (log_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, user_agent)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, entityType, entityId, oldData, newData, ipAddress, userAgent]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// Функция для преобразования entityId в строку
function normalizeEntityId(id: string | string[] | null): string | null {
  if (!id) return null;
  if (Array.isArray(id)) return id[0] || null;
  return id;
}

export function auditMiddleware(entityType: string, getEntityId?: (req: Request) => string | null) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const oldSend = res.send;
    const oldJson = res.json;
    
    // Сохраняем оригинальные методы
    res.send = function(body: any) {
      (res as any).body = body;
      return oldSend.call(this, body);
    };
    
    res.json = function(body: any) {
      (res as any).body = body;
      return oldJson.call(this, body);
    };
    
    const userId = req.user?.user_id || null;
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;
    
    // Для PUT/POST/DELETE операций логируем изменения
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const rawEntityId = getEntityId ? getEntityId(req) : req.params.id || null;
      const entityId = normalizeEntityId(rawEntityId);  // Преобразуем в строку
      const action = `${req.method} ${entityType}`;
      
      // Логируем после завершения запроса
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          auditLog(
            userId,           
            action,          
            entityType,       
            entityId,         
            req.method === 'PUT' || req.method === 'PATCH' ? req.body : null, 
            req.method !== 'DELETE' ? req.body : null,  
            ipAddress,        
            userAgent         
          );
        }
      });
    }
    
    next();
  };
}