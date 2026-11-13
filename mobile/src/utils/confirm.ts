import type { ConfirmOptions } from '../components/ui/ConfirmDialog';

type ConfirmHandler = (options: ConfirmOptions) => Promise<boolean>;

let confirmHandler: ConfirmHandler | null = null;

/** Called by <ConfirmProvider> so code outside React components can open the dialog too. */
export function registerConfirmHandler(handler: ConfirmHandler | null): void {
  confirmHandler = handler;
}

/**
 * Asks the user "are you sure?" with the app's confirmation dialog and resolves to true or false.
 * Use it before every action that saves or changes a transaction (orders, payments, time in/out...).
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!confirmHandler) return Promise.resolve(false);
  return confirmHandler(options);
}
