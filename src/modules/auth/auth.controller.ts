import { Request, Response } from 'express';
import { authService } from './auth.service';
import { asyncHandler, ApiResponseUtil } from '../../common/utils';
import {
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from './auth.validation';

export class AuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as LoginInput;
    const result = await authService.login(input);
    return ApiResponseUtil.success(res, result, 'Authentication successful');
  });

  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RefreshTokenInput;
    const tokens = await authService.refreshToken(input);
    return ApiResponseUtil.success(res, tokens, 'Token refreshed successfully');
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    if (req.user) {
      await authService.logout(req.user._id.toString());
    }
    return ApiResponseUtil.success(res, { loggedOut: true }, 'Successfully logged out');
  });

  getMe = asyncHandler(async (req: Request, res: Response) => {
    const profile = await authService.getMe(req.user!._id.toString());
    return ApiResponseUtil.success(res, profile, 'User profile retrieved');
  });

  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as UpdateProfileInput;
    const updated = await authService.updateProfile(req.user!._id.toString(), input);
    return ApiResponseUtil.success(res, updated, 'Profile updated successfully');
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as ChangePasswordInput;
    await authService.changePassword(req.user!._id.toString(), input);
    return ApiResponseUtil.success(
      res,
      { passwordChanged: true },
      'Password changed successfully. Please log in with your new password.',
    );
  });
}

export const authController = new AuthController();
