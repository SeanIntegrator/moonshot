import type { AdminJwtClaims, JwtClaims, KdsJwtClaims } from '@moonshot/types';
import type { ResolvedCafe } from '../lib/resolved-cafe.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
      kdsUser?: KdsJwtClaims;
      adminUser?: AdminJwtClaims;
      cafe?: ResolvedCafe;
      /** Set by `optionalCustomerAuth` when a valid customer JWT is present */
      customerUserId?: string;
    }
  }
}

export {};
