import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { HttpStatus, HttpStatusCode } from '../constants/http-status';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { ApiErrorResponse } from '../types/common.types';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal error occurred';
  let errors: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if ('name' in err && err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Database validation failed';
    errors = (err as unknown as Record<string, unknown>).errors;
  } else if ('code' in err && (err as { code: number }).code === 11000) {
    // MongoDB duplicate key error
    statusCode = HttpStatus.CONFLICT;
    message = 'Duplicate key error: resource already exists';
  } else if (
    ('code' in err && ((err as { code: number }).code === 112 || (err as { code: number }).code === 24)) ||
    ('name' in err && err.name === 'MongoServerError' && err.message?.includes('Write conflict'))
  ) {
    // Concurrent transaction write conflict
    statusCode = HttpStatus.CONFLICT;
    message = 'The operation conflicted with another concurrent transaction. Please retry your request.';
  } else if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as { status: number }).status === 400
  ) {
    // JSON parse error in body
    statusCode = HttpStatus.BAD_REQUEST;
    message = 'Malformed JSON in request body';
  }

  // Structured logging
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
      `Server Error [${statusCode}]: ${err.message}`,
    );
  } else {
    logger.warn(
      {
        statusCode,
        message,
        method: req.method,
        url: req.originalUrl,
        errors,
      },
      `Client Error [${statusCode}]: ${message}`,
    );
  }

  // Never leak stack traces, internal paths or raw error details in client responses
  const responsePayload: ApiErrorResponse = {
    success: false,
    message:
      env.NODE_ENV === 'production' && statusCode === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : message,
    ...(errors !== undefined && { errors }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(responsePayload);
};
