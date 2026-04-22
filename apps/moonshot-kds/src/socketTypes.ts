import type { KdsSocketEvent } from '@moonshot/types';

/** Ensures `@moonshot/types` resolves in the KDS package (compile-time only). */
export type WorkspaceKdsEvent = KdsSocketEvent;
