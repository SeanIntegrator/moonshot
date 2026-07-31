import { SquareClient, SquareEnvironment } from 'square';
import { resolveSquareEnvironment } from '../../square/oauth-urls.js';

export type SquareClientEnvironment = 'sandbox' | 'production';

/** Build a Square SDK client. Prefer seller OAuth token for Catalog; omit for app-level OAuth. */
export function createSquareClient(opts?: {
  accessToken?: string;
  environment?: SquareClientEnvironment;
}): SquareClient {
  const env = opts?.environment ?? resolveSquareEnvironment();
  return new SquareClient({
    token: opts?.accessToken,
    environment:
      env === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
  });
}

/** App-level client (no seller token) for ObtainToken / RevokeToken. */
export function createSquareAppClient(
  environment?: SquareClientEnvironment,
): SquareClient {
  return createSquareClient({ environment });
}
