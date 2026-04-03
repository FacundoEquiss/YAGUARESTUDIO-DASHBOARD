import { Request, Response, NextFunction } from 'express';

export interface ValidatedRequest<T = any> extends Request {
  validated?: T;
}

interface ValidationSchemas {
  body?: { parse: (data: unknown) => unknown };
  query?: { parse: (data: unknown) => unknown };
  params?: { parse: (data: unknown) => unknown };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (Array.isArray(error)) return error.join(', ');
  return 'Error de validación desconocido';
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    const errors: Record<string, string[]> = {};

    if (schemas.body) {
      try {
        req.validated = {
          ...req.validated,
          body: schemas.body.parse(req.body),
        };
      } catch (error: unknown) {
        errors.body = [getErrorMessage(error)];
      }
    }

    if (schemas.query) {
      try {
        req.validated = {
          ...req.validated,
          query: schemas.query.parse(req.query),
        };
      } catch (error: unknown) {
        errors.query = [getErrorMessage(error)];
      }
    }

    if (schemas.params) {
      try {
        req.validated = {
          ...req.validated,
          params: schemas.params.parse(req.params),
        };
      } catch (error: unknown) {
        errors.params = [getErrorMessage(error)];
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: 'Error de validación',
        details: errors,
      });
      return;
    }

    next();
  };
}