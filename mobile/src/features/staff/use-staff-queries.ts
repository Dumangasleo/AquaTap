import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersApi, shiftsApi } from '../../api/aquatap-api';
import { getErrorMessage } from '../../api/http-client';
import { useToast } from '../../components/ui/Toast';
import { appConfig } from '../../config/app-config';
import { queryKeys } from '../../hooks/query-keys';
import { confirmAction } from '../../utils/confirm';
import { formatTime } from '../../utils/format';

/** Pending orders count (red badge), refreshed every few seconds. */
export function usePendingCount() {
  return useQuery({
    queryKey: queryKeys.pendingCount,
    queryFn: ordersApi.getPendingCount,
    refetchInterval: appConfig.orderPollingIntervalMs,
  });
}

/** The signed-in employee's open shift plus Time in / Time out actions. */
export function useActiveShift() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const activeShiftQuery = useQuery({ queryKey: queryKeys.activeShift, queryFn: shiftsApi.getActiveShift });

  const refreshShiftData = () => {
    void queryClient.invalidateQueries({ queryKey: ['shifts'] });
    void queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const timeInMutation = useMutation({
    mutationFn: shiftsApi.timeIn,
    onSuccess: (shift) => {
      refreshShiftData();
      showToast(`Timed in at ${formatTime(shift.timeIn)}. Have a safe trip!`);
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const timeOutMutation = useMutation({
    mutationFn: (remarks?: string) => shiftsApi.timeOut(remarks),
    onSuccess: (shift) => {
      refreshShiftData();
      showToast(`Timed out at ${formatTime(shift.timeOut)}. Your day was saved.`);
    },
    onError: (error) => showToast(getErrorMessage(error), 'error'),
  });

  const openShift = activeShiftQuery.data?.activeShift ?? null;

  const timeIn = async () => {
    const isConfirmed = await confirmAction({
      title: 'Time in now?',
      message: 'Your deliveries, payments and expenses from now on will be saved in this shift.',
      details: [{ label: 'Time in', value: formatTime(new Date().toISOString()) }],
      confirmLabel: 'Yes, time in',
      tone: 'success',
      icon: 'log-in',
    });
    if (isConfirmed) timeInMutation.mutate();
  };

  const timeOut = async () => {
    const isConfirmed = await confirmAction({
      title: 'Time out now?',
      message: 'Your shift will end and the totals of your deliveries, payments and expenses will be saved.',
      details: [
        { label: 'Time out', value: formatTime(new Date().toISOString()) },
        ...(openShift ? [{ label: 'Time in', value: formatTime(openShift.timeIn) }, { label: 'On duty for', value: formatDurationSince(openShift.timeIn) }] : []),
      ],
      confirmLabel: 'Yes, time out',
      icon: 'log-out',
    });
    if (isConfirmed) timeOutMutation.mutate(undefined);
  };

  return {
    activeShift: activeShiftQuery.data?.activeShift ?? null,
    isLoading: activeShiftQuery.isLoading,
    timeIn,
    timeOut,
    isTimingIn: timeInMutation.isPending,
    isTimingOut: timeOutMutation.isPending,
  };
}

/** "2 hr 15 min" since the given time. */
export function formatDurationSince(isoDate: string, until: Date = new Date()): string {
  const totalMinutes = Math.max(0, Math.round((until.getTime() - new Date(isoDate).getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
}
