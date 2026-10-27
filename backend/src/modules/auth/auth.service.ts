import { UserModel, IUser, UserRole } from '../users/user.model';
import { PasswordUtil, TokenUtil, AuthTokens } from '../../common/utils';
import {
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from './auth.validation';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../../common/errors';

export interface UserAuthProfile {
  id: string;
  employeeCode: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface LoginResult {
  user: UserAuthProfile;
  tokens: AuthTokens;
}

export class AuthService {
  private formatUserProfile(user: IUser): UserAuthProfile {
    return {
      id: user._id.toString(),
      employeeCode: user.employeeCode,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Authenticate user by email & password.
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const user = await UserModel.findOne({ email: input.email.toLowerCase() }).select(
      '+passwordHash',
    );

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact Super Admin');
    }

    const isMatch = await PasswordUtil.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = TokenUtil.generateTokenPair(payload);

    // Securely hash the refresh token before storing in MongoDB
    user.refreshTokenHash = TokenUtil.hashToken(tokens.refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    return {
      user: this.formatUserProfile(user),
      tokens,
    };
  }

  /**
   * Rotate and issue new access & refresh tokens.
   */
  async refreshToken(input: RefreshTokenInput): Promise<AuthTokens> {
    const payload = TokenUtil.verifyRefreshToken(input.refreshToken);

    const user = await UserModel.findById(payload.userId).select('+refreshTokenHash');
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact Super Admin');
    }

    if (!user.refreshTokenHash) {
      throw new UnauthorizedError('Refresh token has been revoked. Please log in again');
    }

    // Compare hash of incoming token with stored hash
    const incomingTokenHash = TokenUtil.hashToken(input.refreshToken);
    if (incomingTokenHash !== user.refreshTokenHash) {
      // Possible token reuse attack - revoke all sessions
      user.refreshTokenHash = undefined;
      await user.save();
      throw new UnauthorizedError('Invalid refresh token. Session terminated for security');
    }

    // Generate rotated token pair
    const newTokens = TokenUtil.generateTokenPair({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    user.refreshTokenHash = TokenUtil.hashToken(newTokens.refreshToken);
    await user.save();

    return newTokens;
  }

  /**
   * Logout user by invalidating their stored refresh token.
   */
  async logout(userId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $unset: { refreshTokenHash: 1 },
    });
  }

  /**
   * Retrieve currently authenticated user profile.
   */
  async getMe(userId: string): Promise<UserAuthProfile> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.formatUserProfile(user);
  }

  /**
   * Update permitted profile fields for the authenticated user.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserAuthProfile> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (input.firstName !== undefined) user.firstName = input.firstName;
    if (input.lastName !== undefined) user.lastName = input.lastName;
    if (input.phone !== undefined) user.phone = input.phone;

    await user.save();
    return this.formatUserProfile(user);
  }

  /**
   * Change user password after verifying current password.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await PasswordUtil.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    if (input.currentPassword === input.newPassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    const newPasswordHash = await PasswordUtil.hash(input.newPassword);
    await UserModel.findByIdAndUpdate(userId, {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
      $unset: { refreshTokenHash: 1 },
    });
  }
}

export const authService = new AuthService();
