/** Snackbar copy when a signed-out user tries to open the order flow. */
export const SIGN_IN_TO_ORDER_MESSAGE = 'Please sign in to order';

/** Snackbar copy when the customer already has an in-progress order. */
export const ACTIVE_ORDER_BLOCK_MESSAGE = 'Finish your current order first';

export type SnackbarLocationState = {
  snackbar?: string;
};
