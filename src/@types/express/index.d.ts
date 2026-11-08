import 'express';

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      auth?: { userId: string };
    }
  }
}
