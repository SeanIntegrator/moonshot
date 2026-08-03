/**
 * Central process.env → typed config. Prefer `config` / `reloadConfig` over raw
 * `process.env` in boot, auth, and new code. Remaining env reads should migrate
 * here over time (payments, Square OAuth, menu image storage, etc.).
 */

export type AppConfig = {
  databaseUrl: string | undefined;
  jwtSecret: string | undefined;
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  corsOrigins: string | undefined;
  googleClientId: string | undefined;
  cronSecret: string | undefined;
  menuAdminEmails: string | undefined;
  /** Optional integrations — present when configured. */
  stripeApiKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripeConnectRefreshUrl: string | undefined;
  stripeConnectReturnUrl: string | undefined;
  stripeConnectAdminRedirectUrl: string | undefined;
  squareApplicationId: string | undefined;
  squareApplicationSecret: string | undefined;
  squareEnvironment: string | undefined;
  squareOauthRedirectUrl: string | undefined;
  squareConnectAdminRedirectUrl: string | undefined;
  squareWebhookSignatureKey: string | undefined;
  squareWebhookNotificationUrl: string | undefined;
  menuImageBucket: string | undefined;
  menuImageEndpoint: string | undefined;
  menuImageRegion: string | undefined;
  menuImageAccessKeyId: string | undefined;
  menuImageSecretAccessKey: string | undefined;
  menuImagePublicBaseUrl: string | undefined;
  orderAheadBaseUrl: string | undefined;
  orderAheadSuccessUrl: string | undefined;
  orderAheadCancelUrl: string | undefined;
  posTokenEncryptionKey: string | undefined;
};

function trimOrUndefined(value: string | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const isProduction = nodeEnv === 'production';
  const databaseUrl = trimOrUndefined(env.DATABASE_URL);
  const jwtSecret = trimOrUndefined(env.JWT_SECRET);

  if (!databaseUrl) {
    if (isProduction) {
      throw new Error('@moonshot/api: DATABASE_URL is required in production');
    }
    console.warn('@moonshot/api: DATABASE_URL is not set — DB routes will fail until configured.');
  }

  if (!jwtSecret && isProduction) {
    throw new Error('@moonshot/api: JWT_SECRET is required in production');
  }

  const portRaw = Number(env.PORT);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? portRaw : 3000;

  return {
    databaseUrl,
    jwtSecret,
    port,
    nodeEnv,
    isProduction,
    corsOrigins: trimOrUndefined(env.CORS_ORIGINS),
    googleClientId: trimOrUndefined(env.GOOGLE_CLIENT_ID),
    cronSecret: trimOrUndefined(env.CRON_SECRET),
    menuAdminEmails: env.MENU_ADMIN_EMAILS,
    stripeApiKey: trimOrUndefined(env.STRIPE_API_KEY),
    stripeWebhookSecret: trimOrUndefined(env.STRIPE_WEBHOOK_SECRET),
    stripeConnectRefreshUrl: trimOrUndefined(env.STRIPE_CONNECT_REFRESH_URL),
    stripeConnectReturnUrl: trimOrUndefined(env.STRIPE_CONNECT_RETURN_URL),
    stripeConnectAdminRedirectUrl: trimOrUndefined(env.STRIPE_CONNECT_ADMIN_REDIRECT_URL),
    squareApplicationId: trimOrUndefined(env.SQUARE_APPLICATION_ID),
    squareApplicationSecret: trimOrUndefined(env.SQUARE_APPLICATION_SECRET),
    squareEnvironment: trimOrUndefined(env.SQUARE_ENVIRONMENT),
    squareOauthRedirectUrl: trimOrUndefined(env.SQUARE_OAUTH_REDIRECT_URL),
    squareConnectAdminRedirectUrl: trimOrUndefined(env.SQUARE_CONNECT_ADMIN_REDIRECT_URL),
    squareWebhookSignatureKey: trimOrUndefined(env.SQUARE_WEBHOOK_SIGNATURE_KEY),
    squareWebhookNotificationUrl: trimOrUndefined(env.SQUARE_WEBHOOK_NOTIFICATION_URL),
    menuImageBucket: trimOrUndefined(env.MENU_IMAGE_BUCKET),
    menuImageEndpoint: trimOrUndefined(env.MENU_IMAGE_ENDPOINT),
    menuImageRegion: trimOrUndefined(env.MENU_IMAGE_REGION),
    menuImageAccessKeyId: trimOrUndefined(env.MENU_IMAGE_ACCESS_KEY_ID),
    menuImageSecretAccessKey: trimOrUndefined(env.MENU_IMAGE_SECRET_ACCESS_KEY),
    menuImagePublicBaseUrl: trimOrUndefined(env.MENU_IMAGE_PUBLIC_BASE_URL),
    orderAheadBaseUrl: trimOrUndefined(env.ORDER_AHEAD_BASE_URL),
    orderAheadSuccessUrl: trimOrUndefined(env.ORDER_AHEAD_SUCCESS_URL),
    orderAheadCancelUrl: trimOrUndefined(env.ORDER_AHEAD_CANCEL_URL),
    posTokenEncryptionKey: trimOrUndefined(env.POS_TOKEN_ENCRYPTION_KEY),
  };
}

/** Mutable so tests can `reloadConfig()` after mutating `process.env`. */
export let config: AppConfig = loadConfig();

/** Re-read `process.env` into `config` (tests / rare runtime env swaps). */
export function reloadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  config = loadConfig(env);
  return config;
}
