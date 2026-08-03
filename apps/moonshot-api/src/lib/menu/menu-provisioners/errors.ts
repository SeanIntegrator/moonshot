import { ApiErrorCode } from '@moonshot/types';

export class MenuProvisionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code:
      | typeof ApiErrorCode.VALIDATION
      | typeof ApiErrorCode.CONFLICT
      | typeof ApiErrorCode.NOT_FOUND
      | 'NOT_IMPLEMENTED',
  ) {
    super(message);
    this.name = 'MenuProvisionError';
  }
}
