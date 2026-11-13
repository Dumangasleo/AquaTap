import { shiftDateOnly, todayDateOnly } from '../../utils/format';

export type DatePreset = 'all' | 'today' | 'last7Days' | 'thisMonth';

export const datePresetOptions: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'last7Days', label: 'Last 7 days' },
  { value: 'thisMonth', label: 'This month' },
];

/** Converts a preset into the dateFrom / dateTo query parameters (YYYY-MM-DD). */
export function resolveDatePreset(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  const today = todayDateOnly();
  switch (preset) {
    case 'today':
      return { dateFrom: today, dateTo: today };
    case 'last7Days':
      return { dateFrom: shiftDateOnly(today, -6), dateTo: today };
    case 'thisMonth':
      return { dateFrom: `${today.slice(0, 7)}-01`, dateTo: today };
    default:
      return {};
  }
}
