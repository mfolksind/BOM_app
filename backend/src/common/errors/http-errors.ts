import { HttpStatus } from '../constants/http-status';
import { AppError } from './app-error';

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', errors?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, true, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, HttpStatus.UNAUTHORIZED, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, HttpStatus.FORBIDDEN, true);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errors?: unknown) {
    super(message, HttpStatus.CONFLICT, true, errors);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', errors?: unknown) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, false, errors);
  }
}
