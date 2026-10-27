import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { UserRole } from '../../modules/users/user.model';
import { UnauthorizedError } from '../errors';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class TokenUtil {
  /**
   * Generates a short-lived access token.
   */
  static generateAccessToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      jwtid: crypto.randomUUID(),
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
  }

  /**
   * Generates a longer-lived refresh token.
   */
  static generateRefreshToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      jwtid: crypto.randomUUID(),
    };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  }

  /**
   * Generates both access and refresh token pair.
   */
  static generateTokenPair(payload: TokenPayload): AuthTokens {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verifies access token signature and expiration.
   */
  static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch (error) {
      if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  /**
   * Verifies refresh token signature and expiration.
   */
  static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch (error) {
      if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token has expired');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Computes a SHA-256 cryptographic hash of a refresh token for safe storage.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
