import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../errors';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};
