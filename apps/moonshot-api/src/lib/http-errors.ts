import { ApiErrorCode } from '@moonshot/types';

/** Structured HTTP error for route handlers (Express 5 async-safe when caught). */
export class ApiHttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.code = code;
  }
}
