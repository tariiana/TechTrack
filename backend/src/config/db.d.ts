import type { Pool, PoolClient, QueryResult } from 'pg';

export const pool: Pool;
export function query(text: string, params?: unknown[]): Promise<QueryResult>;
export function getClient(): Promise<PoolClient>;
export function initDatabase(): Promise<void>;
