import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { BadRequestError } from '../errors';

interface RequestValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validation middleware using Zod.
 * Supports either a direct Zod schema (validates req.body)
 * or an object schema mapping { body, query, params }.
 */
export const validate = (schema: ZodTypeAny | RequestValidationSchema): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schema && typeof schema.parseAsync === 'function') {
        req.body = await schema.parseAsync(req.body);
        return next();
      }

      const compositeSchema = schema as RequestValidationSchema;

      if (compositeSchema.body) {
        req.body = await compositeSchema.body.parseAsync(req.body);
      }
      if (compositeSchema.query) {
        req.query = (await compositeSchema.query.parseAsync(req.query)) as typeof req.query;
      }
      if (compositeSchema.params) {
        req.params = (await compositeSchema.params.parseAsync(req.params)) as typeof req.params;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(new BadRequestError('Validation failed', formattedErrors));
      }
      next(error);
    }
  };
};

export const validateRequest = validate;
