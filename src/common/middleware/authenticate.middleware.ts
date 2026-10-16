import { Request, Response, NextFunction } from 'express';
import { TokenUtil } from '../utils/token.util';
import { UserModel } from '../../modules/users/user.model';
import { UnauthorizedError } from '../errors';

/**
 * Middleware to authenticate requests using JWT Bearer token.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token is malformed');
    }

    const payload = TokenUtil.verifyAccessToken(token);

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User account no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact Super Admin');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
