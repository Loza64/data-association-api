import { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const WINDOW_MS = 15 * 60 * 1000;

export const buildAuthRateLimiter = (limit: number): RequestHandler =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ status: 429, message: 'Demasiadas solicitudes; intenta de nuevo más tarde' });
    },
  });
