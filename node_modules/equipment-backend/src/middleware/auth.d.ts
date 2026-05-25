import type { NextFunction, Request, Response } from 'express';

export function generateToken(user: Record<string, unknown>): string;
export function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
