import type { Pool, PoolClient, QueryResult } from 'pg';

// Типы для CommonJS-модуля db.js, чтобы TypeScript-сервисы могли импортировать
// pool/query/getClient без any.
export const pool: Pool;
export function query(text: string, params?: unknown[]): Promise<QueryResult>;
export function getClient(): Promise<PoolClient>;
export function initDatabase(): Promise<void>;
