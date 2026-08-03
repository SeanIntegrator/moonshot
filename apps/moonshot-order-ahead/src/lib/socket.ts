import { CUSTOMER_SOCKET_NAMESPACE } from '@moonshot/domain';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api.js';

/** Socket.io `/customer` namespace — lifecycle owned by callers (e.g. `useOrderTracking`). */
export function createCustomerSocket(): Socket {
  return io(`${getApiBaseUrl()}${CUSTOMER_SOCKET_NAMESPACE}`, {
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });
}
