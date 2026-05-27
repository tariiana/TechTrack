import type { NextFunction, Request, Response } from 'express';

// Declaration-файл нужен TypeScript-сервисам, которые импортируют CommonJS
// middleware/auth.js.
export function generateToken(user: Record<string, unknown>): string;
export function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
