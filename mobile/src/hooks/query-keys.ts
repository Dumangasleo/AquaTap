/** Central list of React Query keys, so invalidation after a change is easy to follow. */
export const queryKeys = {
  authConfig: ['auth-config'] as const,
  stations: ['water-stations'] as const,
  myStation: ['water-stations', 'mine'] as const,
  contractTemplate: (waterStationId: number) => ['water-stations', waterStationId, 'contract-template'] as const,

  myAccount: ['customers', 'me'] as const,
  myLedger: ['customers', 'me', 'ledger'] as const,
  customers: (search: string) => ['customers', 'list', search] as const,
  customer: (customerId: number) => ['customers', customerId] as const,
  customerLedger: (customerId: number) => ['customers', customerId, 'ledger'] as const,

  orders: ['orders'] as const,
  myOrders: (filter: string) => ['orders', 'mine', filter] as const,
  stationOrders: (filter: string) => ['orders', 'station', filter] as const,
  order: (customerOrderId: number) => ['orders', 'detail', customerOrderId] as const,
  pendingCount: ['orders', 'pending-count'] as const,
  records: (filter: string) => ['orders', 'records', filter] as const,

  credits: (filter: string) => ['credits', filter] as const,
  activeShift: ['shifts', 'active'] as const,
  dailyReport: (date: string, employeeId?: number) => ['reports', 'daily', date, employeeId ?? 'all'] as const,
  businessSummary: (year: number) => ['reports', 'business', year] as const,
  employees: ['employees'] as const,
  paymentChannels: ['payment-channels'] as const,
  myStationVerification: ['station-verification', 'mine'] as const,
  stationReviews: (verificationStatus: string) => ['station-reviews', verificationStatus] as const,
  stationReview: (waterStationId: number) => ['station-reviews', 'detail', waterStationId] as const,
  stationDocumentFile: (stationDocumentId: number) => ['station-document-file', stationDocumentId] as const,

  accountSessions: ['account', 'sessions'] as const,
  accountActivity: (category: string) => ['account', 'activity', category] as const,
};
