import type { JwtClaims } from '@moonshot/types';
import type { ResolvedCafe } from '../lib/resolved-cafe.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
      cafe?: ResolvedCafe;
    }
  }
}

export {};
