/**
 * Authoritative HTTP + Socket identifiers for apps and moonshotApi.
 * Prefer importing these instead of duplicating string literals.
 */

/** Public REST prefix (see masterContext §3.1) */
export const API_VERSION_PREFIX = '/api/v1' as const;

export type ApiVersionPrefix = typeof API_VERSION_PREFIX;

/** Socket.io namespace pathnames (client: `io(origin + namespace)`). */
export const KDS_SOCKET_NAMESPACE = '/kds' as const;
export const CUSTOMER_SOCKET_NAMESPACE = '/customer' as const;
export const ADMIN_SOCKET_NAMESPACE = '/admin' as const;

/** KDS namespace — server → client */
export const KDS_SOCKET_SERVER_EVENT = {
  ORDER_NEW: 'kds:order:new',
  ORDER_UPDATED: 'kds:order:updated',
  ORDER_REMOVED: 'kds:order:removed',
  ETA_UPDATED: 'kds:eta:updated',
} as const;

export type KdsSocketServerEventName =
  (typeof KDS_SOCKET_SERVER_EVENT)[keyof typeof KDS_SOCKET_SERVER_EVENT];

/** Order-ahead / customer namespace — server → client */
export const CUSTOMER_SOCKET_SERVER_EVENT = {
  ORDER_COMPLETED: 'customerOrderCompleted',
  ETA_UPDATED: 'customerEtaUpdated',
  MENU_UPDATED: 'customerMenuUpdated',
  CAFE_UPDATED: 'customerCafeUpdated',
} as const;

export type CustomerSocketServerEventName =
  (typeof CUSTOMER_SOCKET_SERVER_EVENT)[keyof typeof CUSTOMER_SOCKET_SERVER_EVENT];

/** Order-ahead / customer namespace — client → server */
export const CUSTOMER_SOCKET_CLIENT_EVENT = {
  SUBSCRIBE: 'customer:subscribe',
  SUBSCRIBE_CAFE: 'customer:subscribeCafe',
} as const;

export type CustomerSocketClientEventName =
  (typeof CUSTOMER_SOCKET_CLIENT_EVENT)[keyof typeof CUSTOMER_SOCKET_CLIENT_EVENT];

/** Admin namespace — server → client */
export const ADMIN_SOCKET_SERVER_EVENT = {
  MENU_SYNCED: 'admin:menu:synced',
} as const;