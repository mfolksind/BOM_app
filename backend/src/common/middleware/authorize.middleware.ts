import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../../modules/users/user.model';
import { ForbiddenError, UnauthorizedError } from '../errors';

/**
 * Middleware to authorize user roles.
 * Exactly supports 'SUPER_ADMIN' and 'ADMIN'.
 */
export const authorizeRole = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Access forbidden: Requires one of [${allowedRoles.join(', ')}] role`),
      );
    }

    next();
  };
};
