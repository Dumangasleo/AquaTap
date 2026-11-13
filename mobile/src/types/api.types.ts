/**
 * Types of the AquaTap REST API (mirror of the NestJS DTOs in /backend).
 * Dates arrive as ISO strings.
 */

export type UserRole = 'SystemAdmin' | 'Admin' | 'Employee' | 'Customer';
export type OrderStatus = 'Pending' | 'Accepted' | 'Delivered' | 'Declined' | 'Cancelled' | 'Failed';
export type PaymentType = 'Cash' | 'Credit';
export type PaymentMode = 'Cash' | 'GCash' | 'BankTransfer';
export type PaymentStatus = 'Unpaid' | 'Paid';
export type ExpenseCategory = 'Food' | 'Fuel' | 'VehicleRepair' | 'Maintenance' | 'Supplies' | 'Other';
export type PaymentChannelType = 'GCash' | 'BankTransfer';
export type StationVerificationStatus = 'NotSubmitted' | 'UnderReview' | 'Verified' | 'Rejected';
export type StationDocumentType =
  | 'BirCertificateOfRegistration'
  | 'MayorsBusinessPermit'
  | 'DtiOrSecRegistration'
  | 'SanitaryPermit'
  | 'WaterAnalysisCertificate'
  | 'OwnerValidId'
  | 'Other';

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
}

// ----- Auth -----

export interface WaterStationSummary {
  waterStationId: number;
  stationName: string;
  address: string;
  contactNumber: string;
  pricePerGallon: number;
  latitude: number | null;
  longitude: number | null;
  /** Present on the signed-in user's station (profile). */
  verificationStatus?: StationVerificationStatus;
}

export interface Profile {
  userAccountId: number;
  email: string;
  fullName: string | null;
  photoUrl: string | null;
  role: UserRole | null;
  employeeId: number | null;
  customerId: number | null;
  isOwner: boolean;
  needsOnboarding: boolean;
  waterStation: WaterStationSummary | null;
  /** Profile photo as a small image (data URI), or null when the user has none. */
  avatarImage: string | null;
  /** true when the account can also sign in with email + password. */
  hasPassword: boolean;
  /** true when a 6-digit code from an authenticator app is asked at sign-in. */
  isTwoFactorEnabled: boolean;
  /** The sign-in (device) this app is using right now. */
  currentSessionId: number | null;
}

export interface AuthSession {
  accessToken: string;
  profile: Profile;
}

/** Answer of every sign-in call: either signed in, or a 6-digit code is still needed. */
export interface SignInResult {
  requiresTwoFactor: boolean;
  /** Short-lived token to send back together with the 6-digit code. */
  twoFactorToken: string | null;
  accessToken: string | null;
  profile: Profile | null;
}

export interface AuthConfig {
  googleWebClientId: string | null;
  isDevSignInEnabled: boolean;
  isPasswordSignInEnabled?: boolean;
}

// ----- Account: devices, security, activity -----

export type DevicePlatform = 'Android' | 'iOS' | 'Web' | 'Unknown';
export type SignInMethod = 'Google' | 'Password' | 'Developer';

/** Sent with every sign-in so the user can recognize the device later. */
export interface DeviceInfo {
  deviceName: string;
  platform: Exclude<DevicePlatform, 'Unknown'>;
  appVersion?: string;
}

/** One device where the account is signed in. */
export interface UserSession {
  userSessionId: number;
  deviceName: string;
  platform: DevicePlatform;
  appVersion: string | null;
  ipAddress: string | null;
  signInMethod: SignInMethod;
  signedInAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface TwoFactorSetup {
  /** Key to type into the authenticator app when the QR code cannot be scanned. */
  secretKey: string;
  otpauthUrl: string;
  qrCodeDataUri: string;
}

export interface RecoveryCodes {
  recoveryCodes: string[];
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export type ActivityCategory = 'Security' | 'Profile' | 'Orders' | 'Payments' | 'Shift' | 'Station';

/** One line of the account history, e.g. "Placed order AQ261110-AB12 for 3 gallons". */
export interface AccountActivity {
  accountActivityId: number;
  activityType: string;
  activityCategory: ActivityCategory;
  description: string;
  deviceName: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AccountActivityPage {
  items: AccountActivity[];
  /** Pass as beforeId to load older activity; null when there is no more. */
  nextBeforeId: number | null;
}

// ----- Water stations -----

export interface WaterStation extends WaterStationSummary {
  contractTemplate: string;
  usesDefaultContractTemplate: boolean;
  verificationStatus: StationVerificationStatus;
  verificationRemarks: string | null;
}

// ----- Station KYB verification -----

export interface StationDocument {
  stationDocumentId: number;
  documentType: StationDocumentType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface StationDocumentFile extends StationDocument {
  fileData: string;
}

export interface StationVerification {
  waterStationId: number;
  stationName: string;
  registeredBusinessName: string | null;
  taxIdentificationNumber: string | null;
  address: string;
  contactNumber: string;
  verificationStatus: StationVerificationStatus;
  verificationRemarks: string | null;
  verificationSubmittedAt: string | null;
  verifiedAt: string | null;
  ownerFullName: string | null;
  ownerEmail: string | null;
  requiredDocumentTypes: StationDocumentType[];
  missingDocumentTypes: StationDocumentType[];
  documents: StationDocument[];
  isEditable: boolean;
  createdAt: string;
}

export interface UploadStationDocumentRequest {
  documentType: StationDocumentType;
  fileName: string;
  fileData: string;
}

export interface ContractTemplate {
  waterStationId: number;
  stationName: string;
  contractTemplate: string;
}

export interface RegisterWaterStationRequest {
  ownerFullName: string;
  stationName: string;
  address: string;
  contactNumber: string;
  pricePerGallon: number;
  latitude?: number;
  longitude?: number;
}

export interface UpdateWaterStationRequest {
  stationName?: string;
  address?: string;
  contactNumber?: string;
  pricePerGallon?: number;
  latitude?: number;
  longitude?: number;
  contractTemplate?: string;
}

// ----- Customers -----

export interface RegisterCustomerRequest {
  waterStationId: number;
  fullName: string;
  address: string;
  occupation?: string;
  contactNumber: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  borrowedGallons: number;
  signatureSvg: string;
  useContractTemplate: boolean;
}

export interface UpdateCustomerProfileRequest {
  address?: string;
  occupation?: string;
  contactNumber?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface GallonBalance {
  borrowedGallons: number;
  gallonsDelivered: number;
  gallonsReturned: number;
  remainingGallons: number;
}

export interface GallonContract {
  gallonContractId: number;
  fullName: string;
  address: string;
  occupation: string | null;
  contactNumber: string;
  borrowedGallons: number;
  contractBody: string | null;
  signatureSvg: string;
  signedAt: string;
}

export interface CustomerAccount {
  customerId: number;
  waterStationId: number;
  stationName: string;
  email: string | null;
  fullName: string;
  address: string;
  occupation: string | null;
  contactNumber: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  contract: GallonContract | null;
  gallonBalance: GallonBalance;
  credit: { unpaidBalance: number; unpaidOrderCount: number; totalPaid: number };
  totalOrders: number;
  activeOrders: number;
}

export interface CustomerListItem {
  customerId: number;
  fullName: string;
  address: string;
  contactNumber: string;
  landmark: string | null;
  createdAt: string;
  remainingGallons: number;
  unpaidBalance: number;
  lastOrderAt: string | null;
}

export interface GallonLedgerEntry {
  entryType: 'Contract' | 'Delivery';
  referenceId: number;
  orderNumber: string | null;
  entryDate: string;
  borrowedGallons: number;
  gallonsOrdered: number;
  returnedGallons: number;
  remainingGallons: number;
  totalAmount: number;
  paymentType: PaymentType | null;
  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus | null;
}

// ----- Orders -----

export interface CreateOrderRequest {
  gallonsOrdered: number;
  returnedGallons?: number;
  paymentType: PaymentType;
  paymentMode?: PaymentMode;
  paymentReference?: string;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  customerNotes?: string;
}

export interface DeliverOrderRequest {
  returnedGallons: number;
  paymentMode?: PaymentMode;
  paymentReference?: string;
}

export interface CustomerOrder {
  customerOrderId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  statusReason: string | null;
  gallonsOrdered: number;
  returnedGallons: number;
  pricePerGallon: number;
  totalAmount: number;
  paymentType: PaymentType;
  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  customerNotes: string | null;
  orderedAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  paidAt: string | null;
  customer: {
    customerId: number;
    fullName: string;
    contactNumber: string;
    address: string;
    landmark: string | null;
  } | null;
  handledBy: {
    employeeId: number;
    fullName: string;
    contactNumber: string | null;
    lastLatitude: number | null;
    lastLongitude: number | null;
    lastLocationAt: string | null;
  } | null;
  isAssignedToMe: boolean;
}

export interface PendingOrderCount {
  pendingCount: number;
  myActiveCount: number;
}

export interface StationRecordRow {
  customerOrderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  employeeName: string | null;
  deliveredAt: string;
  gallonsOrdered: number;
  returnedGallons: number;
  remainingGallons: number;
  totalAmount: number;
  paymentType: PaymentType;
  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus;
}

// ----- Credits -----

export interface CreditItem {
  customerOrderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  contactNumber: string;
  orderedAt: string;
  deliveredAt: string | null;
  gallonsOrdered: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode | null;
  paymentReference: string | null;
  paidAt: string | null;
  handledByName: string | null;
}

export interface CreditList {
  items: CreditItem[];
  totalCount: number;
  totalAmount: number;
}

export interface SettleCreditsRequest {
  customerOrderIds: number[];
  paymentMode: PaymentMode;
  referenceNumber?: string;
  paidOn?: string;
  remarks?: string;
}

export interface SettleCreditsResult {
  settledCount: number;
  totalAmountPaid: number;
  paidAt: string;
}

// ----- Shifts, expenses, reports -----

export interface EmployeeShift {
  employeeShiftId: number;
  employeeId: number;
  employeeName: string | null;
  shiftDate: string;
  timeIn: string;
  timeOut: string | null;
  isOpen: boolean;
  totalDeliveredOrders: number;
  totalGallonsDelivered: number;
  totalGallonsReturned: number;
  totalCashSales: number;
  totalCreditSales: number;
  totalCollections: number;
  totalExpenses: number;
  netCashOnHand: number;
  remarks: string | null;
}

export interface Expense {
  expenseId: number;
  expenseCategory: ExpenseCategory;
  amount: number;
  description: string | null;
  expenseDate: string;
  employeeId: number | null;
  employeeName: string | null;
  createdAt: string;
}

export interface CreateExpenseRequest {
  expenseCategory: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate?: string;
}

export interface TransactionSummary {
  deliveredOrders: number;
  declinedOrders: number;
  cancelledOrders: number;
  failedOrders: number;
  inProgressOrders: number;
  pendingOrders: number;
  gallonsDelivered: number;
  gallonsReturned: number;
  cashSales: number;
  creditSales: number;
  grossSales: number;
  collections: number;
  totalReceived: number;
  receivedByMode: Record<PaymentMode, number>;
  totalExpenses: number;
  netIncome: number;
  cashOnHand: number;
}

export interface DailyReport {
  date: string;
  employeeId: number | null;
  summary: TransactionSummary;
  transactions: CustomerOrder[];
  expenses: Expense[];
  shifts: EmployeeShift[];
}

export interface MonthlyBusinessFigures {
  month: number;
  monthLabel: string;
  deliveredOrders: number;
  gallonsDelivered: number;
  sales: number;
  collections: number;
  expenses: number;
  netIncome: number;
  newCustomers: number;
}

export interface BusinessSummary {
  year: number;
  months: MonthlyBusinessFigures[];
  totals: Omit<MonthlyBusinessFigures, 'month' | 'monthLabel'>;
  expensesByCategory: { expenseCategory: ExpenseCategory; amount: number }[];
  outstandingCredits: number;
  totalCustomers: number;
}

// ----- Employees & payment channels -----

export interface Employee {
  employeeId: number;
  fullName: string;
  email: string;
  contactNumber: string | null;
  isOwner: boolean;
  isActive: boolean;
  hasSignedIn: boolean;
  isOnDuty: boolean;
  createdAt: string;
}

export interface InviteEmployeeRequest {
  fullName: string;
  email: string;
  contactNumber?: string;
}

export interface PaymentChannel {
  paymentChannelId: number;
  channelType: PaymentChannelType;
  channelName: string;
  accountName: string;
  accountNumber: string;
  qrImage: string | null;
  isActive: boolean;
}

export interface SavePaymentChannelRequest {
  channelType?: PaymentChannelType;
  channelName?: string;
  accountName?: string;
  accountNumber?: string;
  qrImage?: string;
  isActive?: boolean;
}
