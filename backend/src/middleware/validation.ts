import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      const details: any = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path.join('.');
          details[field] = err.message;
        });
      }
      next(new ValidationError('参数验证失败', details));
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error: any) {
      const details: any = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const field = err.path.join('.');
          details[field] = err.message;
        });
      }
      next(new ValidationError('查询参数验证失败', details));
    }
  };
};

