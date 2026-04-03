import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, 400);
    this.fieldErrors = fieldErrors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'No autenticado') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'No tienes permisos para realizar esta acción') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      error: err.message,
      statusCode: err.statusCode,
    };

    if (err instanceof ValidationError && err.fieldErrors) {
      response.details = err.fieldErrors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle generic errors
  if (err instanceof Error) {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Error interno del servidor',
      statusCode: 500,
    });
    return;
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    statusCode: 500,
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    statusCode: 404,
  });
}