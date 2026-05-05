import type { JwtClaims, KdsJwtClaims } from '@moonshot/types';
import type { ResolvedCafe } from '../lib/resolved-cafe.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
      kdsUser?: KdsJwtClaims;
      cafe?: ResolvedCafe;
    }
  }
}

export {};
