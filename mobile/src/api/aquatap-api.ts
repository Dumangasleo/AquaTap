import type {
  AccountActivityPage,
  ActivityCategory,
  AuthConfig,
  BusinessSummary,
  ChangePasswordRequest,
  ContractTemplate,
  CreateExpenseRequest,
  CreateOrderRequest,
  CreditList,
  CustomerAccount,
  CustomerListItem,
  CustomerOrder,
  DailyReport,
  DeliverOrderRequest,
  Employee,
  EmployeeShift,
  Expense,
  GallonLedgerEntry,
  InviteEmployeeRequest,
  OrderStatus,
  PaymentChannel,
  PaymentMode,
  PaymentStatus,
  PaymentType,
  PendingOrderCount,
  Profile,
  RecoveryCodes,
  RegisterCustomerRequest,
  RegisterWaterStationRequest,
  SavePaymentChannelRequest,
  SettleCreditsRequest,
  SettleCreditsResult,
  SignInResult,
  StationDocument,
  StationDocumentFile,
  StationRecordRow,
  StationVerification,
  StationVerificationStatus,
  TwoFactorSetup,
  UploadStationDocumentRequest,
  UpdateCustomerProfileRequest,
  UpdateWaterStationRequest,
  UserSession,
  WaterStation,
  WaterStationSummary,
} from '../types/api.types';
import { getDeviceInfo } from '../utils/device-info';
import { httpClient } from './http-client';

/** Drops undefined / empty values so they are not sent as query parameters. */
function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>;
}

const getData = <T>(promise: Promise<{ data: T }>) => promise.then((response) => response.data);

export const authApi = {
  getConfig: () => getData<AuthConfig>(httpClient.get('/auth/config')),
  signInWithGoogle: (idToken: string) =>
    getData<SignInResult>(httpClient.post('/auth/google', { idToken, device: getDeviceInfo() })),
  signInAsDeveloper: (email: string) =>
    getData<SignInResult>(httpClient.post('/auth/dev-sign-in', { email, device: getDeviceInfo() })),
  signInWithPassword: (email: string, password: string) =>
    getData<SignInResult>(httpClient.post('/auth/password', { email, password, device: getDeviceInfo() })),
  /** Second step when the account has two-step sign-in: the 6-digit code or a backup code. */
  verifyTwoFactor: (twoFactorToken: string, code: string) =>
    getData<SignInResult>(httpClient.post('/auth/two-factor', { twoFactorToken, code, device: getDeviceInfo() })),
  signOut: () => httpClient.post('/auth/sign-out').then(() => undefined),
  getProfile: () => getData<Profile>(httpClient.get('/auth/me')),
  updateFullName: (fullName: string) => getData<Profile>(httpClient.patch('/auth/me', { fullName })),
};

/** The signed-in user's own account: photo, password, two-step sign-in, devices and history. */
export const accountApi = {
  uploadAvatar: (imageDataUri: string) => getData<Profile>(httpClient.put('/account/avatar', { imageDataUri })),
  removeAvatar: () => getData<Profile>(httpClient.delete('/account/avatar')),
  changePassword: (request: ChangePasswordRequest) =>
    httpClient.put('/account/password', request).then(() => undefined),

  setupTwoFactor: () => getData<TwoFactorSetup>(httpClient.post('/account/two-factor/setup')),
  enableTwoFactor: (code: string) => getData<RecoveryCodes>(httpClient.post('/account/two-factor/enable', { code })),
  disableTwoFactor: (code: string) => httpClient.post('/account/two-factor/disable', { code }).then(() => undefined),
  regenerateRecoveryCodes: (code: string) =>
    getData<RecoveryCodes>(httpClient.post('/account/two-factor/recovery-codes', { code })),

  listSessions: () => getData<UserSession[]>(httpClient.get('/account/sessions')),
  signOutSession: (userSessionId: number) =>
    httpClient.delete(`/account/sessions/${userSessionId}`).then(() => undefined),
  signOutOtherSessions: () =>
    getData<{ signedOutCount: number }>(httpClient.post('/account/sessions/sign-out-others')),

  listActivity: (params: { limit?: number; beforeId?: number; category?: ActivityCategory }) =>
    getData<AccountActivityPage>(httpClient.get('/account/activity', { params: cleanParams(params) })),
};

export const waterStationsApi = {
  listStations: () => getData<WaterStationSummary[]>(httpClient.get('/water-stations')),
  registerStation: (request: RegisterWaterStationRequest) =>
    getData<WaterStation>(httpClient.post('/water-stations', request)),
  getMyStation: () => getData<WaterStation>(httpClient.get('/water-stations/mine')),
  updateMyStation: (request: UpdateWaterStationRequest) =>
    getData<WaterStation>(httpClient.patch('/water-stations/mine', request)),
  getContractTemplate: (waterStationId: number) =>
    getData<ContractTemplate>(httpClient.get(`/water-stations/${waterStationId}/contract-template`)),
};

export const customersApi = {
  register: (request: RegisterCustomerRequest) =>
    getData<CustomerAccount>(httpClient.post('/customers/register', request)),
  getMyAccount: () => getData<CustomerAccount>(httpClient.get('/customers/me')),
  updateMyProfile: (request: UpdateCustomerProfileRequest) =>
    getData<CustomerAccount>(httpClient.patch('/customers/me', request)),
  getMyLedger: () => getData<GallonLedgerEntry[]>(httpClient.get('/customers/me/ledger')),
  listCustomers: (search?: string) =>
    getData<CustomerListItem[]>(httpClient.get('/customers', { params: cleanParams({ search }) })),
  getCustomer: (customerId: number) => getData<CustomerAccount>(httpClient.get(`/customers/${customerId}`)),
  getCustomerLedger: (customerId: number) =>
    getData<GallonLedgerEntry[]>(httpClient.get(`/customers/${customerId}/ledger`)),
};

export interface CustomerOrderFilter {
  statuses?: OrderStatus[];
  paymentType?: PaymentType;
  paymentStatus?: PaymentStatus;
}

export interface StationOrderFilter {
  statuses?: OrderStatus[];
  date?: string;
  search?: string;
}

export const ordersApi = {
  placeOrder: (request: CreateOrderRequest) => getData<CustomerOrder>(httpClient.post('/customer-orders', request)),
  listMyOrders: (filter: CustomerOrderFilter = {}) =>
    getData<CustomerOrder[]>(
      httpClient.get('/customer-orders/mine', {
        params: cleanParams({ ...filter, statuses: filter.statuses?.join(',') }),
      }),
    ),
  listStationOrders: (filter: StationOrderFilter = {}) =>
    getData<CustomerOrder[]>(
      httpClient.get('/customer-orders', {
        params: cleanParams({ ...filter, statuses: filter.statuses?.join(',') }),
      }),
    ),
  getPendingCount: () => getData<PendingOrderCount>(httpClient.get('/customer-orders/pending-count')),
  getRecords: (params: { search?: string; dateFrom?: string; dateTo?: string }) =>
    getData<StationRecordRow[]>(httpClient.get('/customer-orders/records', { params: cleanParams(params) })),
  getOrder: (customerOrderId: number) => getData<CustomerOrder>(httpClient.get(`/customer-orders/${customerOrderId}`)),
  accept: (customerOrderId: number) =>
    getData<CustomerOrder>(httpClient.patch(`/customer-orders/${customerOrderId}/accept`)),
  decline: (customerOrderId: number, reason: string) =>
    getData<CustomerOrder>(httpClient.patch(`/customer-orders/${customerOrderId}/decline`, { reason })),
  cancel: (customerOrderId: number, reason?: string) =>
    getData<CustomerOrder>(httpClient.patch(`/customer-orders/${customerOrderId}/cancel`, { reason })),
  deliver: (customerOrderId: number, request: DeliverOrderRequest) =>
    getData<CustomerOrder>(httpClient.patch(`/customer-orders/${customerOrderId}/deliver`, request)),
  fail: (customerOrderId: number, reason: string) =>
    getData<CustomerOrder>(httpClient.patch(`/customer-orders/${customerOrderId}/fail`, { reason })),
  submitPaymentReference: (customerOrderId: number, paymentMode: PaymentMode, paymentReference: string) =>
    getData<CustomerOrder>(
      httpClient.patch(`/customer-orders/${customerOrderId}/payment-reference`, { paymentMode, paymentReference }),
    ),
};

export const creditsApi = {
  listCredits: (params: { search?: string; dateFrom?: string; dateTo?: string; paymentStatus?: PaymentStatus }) =>
    getData<CreditList>(httpClient.get('/credits', { params: cleanParams(params) })),
  settle: (request: SettleCreditsRequest) => getData<SettleCreditsResult>(httpClient.post('/credits/settle', request)),
};

export const shiftsApi = {
  getActiveShift: () => getData<{ activeShift: EmployeeShift | null }>(httpClient.get('/employee-shifts/active')),
  timeIn: () => getData<EmployeeShift>(httpClient.post('/employee-shifts/time-in')),
  timeOut: (remarks?: string) => getData<EmployeeShift>(httpClient.post('/employee-shifts/time-out', { remarks })),
};

export const expensesApi = {
  create: (request: CreateExpenseRequest) => getData<Expense>(httpClient.post('/expenses', request)),
  remove: (expenseId: number) => httpClient.delete(`/expenses/${expenseId}`),
};

export const reportsApi = {
  getDailyReport: (params: { date?: string; employeeId?: number }) =>
    getData<DailyReport>(httpClient.get('/reports/daily', { params: cleanParams(params) })),
  getBusinessSummary: (year: number) =>
    getData<BusinessSummary>(httpClient.get('/reports/business-summary', { params: { year } })),
};

export const employeesApi = {
  list: () => getData<Employee[]>(httpClient.get('/employees')),
  invite: (request: InviteEmployeeRequest) => getData<Employee>(httpClient.post('/employees', request)),
  update: (employeeId: number, request: { fullName?: string; contactNumber?: string; isActive?: boolean }) =>
    getData<Employee>(httpClient.patch(`/employees/${employeeId}`, request)),
  updateMyLocation: (latitude: number, longitude: number) =>
    httpClient.patch('/employees/me/location', { latitude, longitude }),
};

export const paymentChannelsApi = {
  list: () => getData<PaymentChannel[]>(httpClient.get('/payment-channels')),
  create: (request: SavePaymentChannelRequest) =>
    getData<PaymentChannel>(httpClient.post('/payment-channels', request)),
  update: (paymentChannelId: number, request: SavePaymentChannelRequest) =>
    getData<PaymentChannel>(httpClient.patch(`/payment-channels/${paymentChannelId}`, request)),
};

export const stationVerificationApi = {
  getMine: () => getData<StationVerification>(httpClient.get('/water-stations/mine/verification')),
  updateBusinessInfo: (registeredBusinessName: string, taxIdentificationNumber: string) =>
    getData<StationVerification>(
      httpClient.put('/water-stations/mine/verification/business-info', { registeredBusinessName, taxIdentificationNumber }),
    ),
  uploadDocument: (request: UploadStationDocumentRequest) =>
    getData<StationDocument>(httpClient.post('/water-stations/mine/verification/documents', request, { timeout: 60_000 })),
  getDocumentFile: (stationDocumentId: number) =>
    getData<StationDocumentFile>(httpClient.get(`/water-stations/mine/verification/documents/${stationDocumentId}`)),
  deleteDocument: (stationDocumentId: number) =>
    httpClient.delete(`/water-stations/mine/verification/documents/${stationDocumentId}`),
  submit: () => getData<StationVerification>(httpClient.post('/water-stations/mine/verification/submit')),
};

/** AquaTap reviewer (SystemAdmin) */
export const stationReviewsApi = {
  list: (verificationStatus?: StationVerificationStatus) =>
    getData<StationVerification[]>(httpClient.get('/station-reviews', { params: cleanParams({ verificationStatus }) })),
  get: (waterStationId: number) => getData<StationVerification>(httpClient.get(`/station-reviews/${waterStationId}`)),
  getDocumentFile: (waterStationId: number, stationDocumentId: number) =>
    getData<StationDocumentFile>(httpClient.get(`/station-reviews/${waterStationId}/documents/${stationDocumentId}`)),
  approve: (waterStationId: number) =>
    getData<StationVerification>(httpClient.post(`/station-reviews/${waterStationId}/approve`)),
  reject: (waterStationId: number, remarks: string) =>
    getData<StationVerification>(httpClient.post(`/station-reviews/${waterStationId}/reject`, { remarks })),
};
