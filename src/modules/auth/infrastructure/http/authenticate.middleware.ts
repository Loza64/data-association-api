import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../../../shared/errors/AppError';
import { UserRepository } from '../../../user/domain/user.repository';
import { TokenService } from '../../domain/token-service';

export const buildAuthenticate =
  (tokenService: TokenService, userRepository: UserRepository): RequestHandler =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      next(new AppError('Token de acceso requerido', 401));
      return;
    }

    try {
      const { userId } = tokenService.verify(token);

      if (!(await userRepository.exists(userId))) {
        throw new AppError('Token inválido', 401);
      }

      req.auth = { userId };
      next();
    } catch (err) {
      next(err);
    }
  };

export const getAuthUserId = (req: Request): string => {
  if (!req.auth) {
    throw new AppError('No autenticado', 401);
  }
  return req.auth.userId;
};
