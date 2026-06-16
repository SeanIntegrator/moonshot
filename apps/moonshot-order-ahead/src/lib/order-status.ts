import type { OrderStatus } from '@moonshot/types';
import type { ChipProps } from '@mui/material';

type OrderStatusMeta = {
  label: string;
  chipColor: ChipProps['color'];
};

const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  pending: { label: 'Confirmed', chipColor: 'primary' },
  confirmed: { label: 'Confirmed', chipColor: 'primary' },
  preparing: { label: 'Preparing', chipColor: 'primary' },
  ready: { label: 'Ready', chipColor: 'success' },
  completed: { label: 'Done', chipColor: 'success' },
  cancelled: { label: 'Cancelled', chipColor: 'error' },
};

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return ORDER_STATUS_META[status as OrderStatus] ?? { label: status, chipColor: 'default' };
}
