import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/aquatap-api';
import { getErrorMessage } from '../api/http-client';
import { useToast } from '../components/ui/Toast';
import type { CustomerOrder, DeliverOrderRequest } from '../types/api.types';

/**
 * All order status changes in one hook. After each change every order list, the pending
 * badge, the records grid and the daily report are refreshed.
 */
export function useOrderActions(customerOrderId: number) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const onSuccess = (order: CustomerOrder, message: string) => {
    queryClient.setQueryData(['orders', 'detail', customerOrderId], order);
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
    void queryClient.invalidateQueries({ queryKey: ['customers'] });
    void queryClient.invalidateQueries({ queryKey: ['credits'] });
    showToast(message);
  };
  const onError = (error: unknown) => showToast(getErrorMessage(error), 'error');

  return {
    accept: useMutation({
      mutationFn: () => ordersApi.accept(customerOrderId),
      onSuccess: (order) => onSuccess(order, 'Order accepted. Deliver it now!'),
      onError,
    }),
    decline: useMutation({
      mutationFn: (reason: string) => ordersApi.decline(customerOrderId, reason),
      onSuccess: (order) => onSuccess(order, 'Order declined.'),
      onError,
    }),
    cancel: useMutation({
      mutationFn: (reason?: string) => ordersApi.cancel(customerOrderId, reason),
      onSuccess: (order) => onSuccess(order, 'Your order was cancelled.'),
      onError,
    }),
    deliver: useMutation({
      mutationFn: (request: DeliverOrderRequest) => ordersApi.deliver(customerOrderId, request),
      onSuccess: (order) => onSuccess(order, 'Delivery completed and recorded.'),
      onError,
    }),
    fail: useMutation({
      mutationFn: (reason: string) => ordersApi.fail(customerOrderId, reason),
      onSuccess: (order) => onSuccess(order, 'Marked as failed delivery.'),
      onError,
    }),
  };
}
