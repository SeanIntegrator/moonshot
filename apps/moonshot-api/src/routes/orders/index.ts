import type { IRouter } from 'express';
import { Router } from 'express';
import { requireCafeContext } from '../../middleware/cafe-context.js';
import { checkoutSessionRouter } from './checkout-session-route.js';
import { createOrderRouter } from './create-order-route.js';
import { customerOrdersRouter } from './customer-orders-route.js';

/** Café-scoped order routes — `requireCafeContext` applied here */
export const ordersRouter: IRouter = Router();

ordersRouter.use(requireCafeContext);
ordersRouter.use(checkoutSessionRouter);
ordersRouter.use(customerOrdersRouter);
ordersRouter.use(createOrderRouter);
