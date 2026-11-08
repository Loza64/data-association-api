import { NextFunction, Request, Response } from 'express';

export const noStore = (_req: Request, res: Response, next: NextFunction): void => {
  res.set('Cache-Control', 'no-store');
  next();
};
