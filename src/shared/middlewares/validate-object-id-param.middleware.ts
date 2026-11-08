import { NextFunction, Request, Response } from 'express';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const validateObjectIdParam = (
  _req: Request,
  res: Response,
  next: NextFunction,
  value: string,
): void => {
  if (!OBJECT_ID_REGEX.test(value)) {
    res.status(400).json({ status: 400, message: 'El id debe ser un ObjectId válido (24 caracteres hexadecimales)' });
    return;
  }
  next();
};
