import { Response } from 'express';
import { HttpStatus, HttpStatusCode } from '../constants/http-status';
import { ApiResponse } from '../types/common.types';

export class ApiResponseUtil {
  /**
   * Send a successful JSON response.
   */
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode: HttpStatusCode = HttpStatus.OK,
    meta?: Record<string, unknown>,
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(payload);
  }

  /**
   * Send a created (201) JSON response.
   */
  static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully',
    meta?: Record<string, unknown>,
  ): Response {
    return this.success(res, data, message, HttpStatus.CREATED, meta);
  }

  /**
   * Send a no-content (204) response.
   */
  static noContent(res: Response): Response {
    return res.status(HttpStatus.NO_CONTENT).send();
  }
}
