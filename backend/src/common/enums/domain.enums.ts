/** Enum values match the ENUM definitions in database/aquatap_schema.sql exactly. */

export enum UserRole {
  /** AquaTap platform reviewer: approves or rejects station KYB documents. */
  SystemAdmin = 'SystemAdmin',
  Admin = 'Admin',
  Employee = 'Employee',
  Customer = 'Customer',
}

export enum OrderStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Delivered = 'Delivered',
  Declined = 'Declined',
  Cancelled = 'Cancelled',
  Failed = 'Failed',
}

/** Cash = paid upon delivery. Credit = "utang", paid later. */
export enum PaymentType {
  Cash = 'Cash',
  Credit = 'Credit',
}

export enum PaymentMode {
  Cash = 'Cash',
  GCash = 'GCash',
  BankTransfer = 'BankTransfer',
}

export enum PaymentStatus {
  Unpaid = 'Unpaid',
  Paid = 'Paid',
}

export enum ExpenseCategory {
  Food = 'Food',
  Fuel = 'Fuel',
  VehicleRepair = 'VehicleRepair',
  Maintenance = 'Maintenance',
  Supplies = 'Supplies',
  Other = 'Other',
}

export enum PaymentChannelType {
  GCash = 'GCash',
  BankTransfer = 'BankTransfer',
}

/** KYB (Know Your Business) status of a water refilling station. */
export enum StationVerificationStatus {
  NotSubmitted = 'NotSubmitted',
  UnderReview = 'UnderReview',
  Verified = 'Verified',
  Rejected = 'Rejected',
}

export enum StationDocumentType {
  /** BIR Form 2303 */
  BirCertificateOfRegistration = 'BirCertificateOfRegistration',
  MayorsBusinessPermit = 'MayorsBusinessPermit',
  DtiOrSecRegistration = 'DtiOrSecRegistration',
  SanitaryPermit = 'SanitaryPermit',
  /** Bacteriological / physico-chemical water analysis from a DOH-accredited laboratory */
  WaterAnalysisCertificate = 'WaterAnalysisCertificate',
  OwnerValidId = 'OwnerValidId',
  Other = 'Other',
}

/** Documents a station must upload before it can be submitted for review. */
export const REQUIRED_STATION_DOCUMENT_TYPES: readonly StationDocumentType[] = [
  StationDocumentType.BirCertificateOfRegistration,
  StationDocumentType.MayorsBusinessPermit,
  StationDocumentType.DtiOrSecRegistration,
  StationDocumentType.SanitaryPermit,
  StationDocumentType.WaterAnalysisCertificate,
  StationDocumentType.OwnerValidId,
];

/** Names of the KYB documents in plain words (used in sentences such as the activity log). */
export const STATION_DOCUMENT_LABELS: Readonly<Record<StationDocumentType, string>> = {
  [StationDocumentType.BirCertificateOfRegistration]: 'BIR Certificate of Registration',
  [StationDocumentType.MayorsBusinessPermit]: "Mayor's / Business Permit",
  [StationDocumentType.DtiOrSecRegistration]: 'DTI or SEC Registration',
  [StationDocumentType.SanitaryPermit]: 'Sanitary Permit',
  [StationDocumentType.WaterAnalysisCertificate]: 'Water Analysis Certificate',
  [StationDocumentType.OwnerValidId]: "Owner's Valid ID",
  [StationDocumentType.Other]: 'Other document',
};

/** Roles that work inside the station (accept orders, collect payments, record expenses). */
export const STAFF_ROLES: readonly UserRole[] = [UserRole.Admin, UserRole.Employee];

/** Final statuses: once reached, the order can no longer change. */
export const CLOSED_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Declined,
  OrderStatus.Cancelled,
  OrderStatus.Failed,
];

// ---------------------------------------------------------------------------------------------
// Account security: devices (sessions), sign-in methods and the account activity log
// ---------------------------------------------------------------------------------------------

export enum DevicePlatform {
  Android = 'Android',
  iOS = 'iOS',
  Web = 'Web',
  Unknown = 'Unknown',
}

/** Platforms the app can report when it signs in ("Unknown" is only used when it reports nothing). */
export const REPORTED_DEVICE_PLATFORMS: readonly DevicePlatform[] = [
  DevicePlatform.Android,
  DevicePlatform.iOS,
  DevicePlatform.Web,
];

export enum SignInMethod {
  Google = 'Google',
  Password = 'Password',
  /** Email-only sign-in for local testing (AUTH_DEV_SIGN_IN_ENABLED=true). */
  Developer = 'Developer',
}

/** Groups of the account activity log (the filter in Profile > Activity). */
export enum ActivityCategory {
  Security = 'Security',
  Profile = 'Profile',
  Orders = 'Orders',
  Payments = 'Payments',
  Shift = 'Shift',
  Station = 'Station',
}

/** Everything the activity log records. Saved as text in AccountActivity.ActivityType. */
export enum ActivityType {
  // Security
  SignedIn = 'SignedIn',
  SignInFailed = 'SignInFailed',
  SignedOut = 'SignedOut',
  DeviceSignedOut = 'DeviceSignedOut',
  OtherDevicesSignedOut = 'OtherDevicesSignedOut',
  PasswordSet = 'PasswordSet',
  PasswordChanged = 'PasswordChanged',
  TwoFactorEnabled = 'TwoFactorEnabled',
  TwoFactorDisabled = 'TwoFactorDisabled',
  RecoveryCodesRegenerated = 'RecoveryCodesRegenerated',

  // Profile
  AvatarChanged = 'AvatarChanged',
  AvatarRemoved = 'AvatarRemoved',
  ProfileUpdated = 'ProfileUpdated',
  CustomerDetailsUpdated = 'CustomerDetailsUpdated',
  ContractSigned = 'ContractSigned',

  // Orders
  OrderPlaced = 'OrderPlaced',
  OrderCancelled = 'OrderCancelled',
  OrderAccepted = 'OrderAccepted',
  OrderDeclined = 'OrderDeclined',
  OrderDelivered = 'OrderDelivered',
  OrderFailed = 'OrderFailed',

  // Payments
  PaymentReferenceSent = 'PaymentReferenceSent',
  CreditsSettled = 'CreditsSettled',

  // Shift
  ShiftStarted = 'ShiftStarted',
  ShiftEnded = 'ShiftEnded',
  ExpenseAdded = 'ExpenseAdded',
  ExpenseDeleted = 'ExpenseDeleted',

  // Station
  StationRegistered = 'StationRegistered',
  StationUpdated = 'StationUpdated',
  PaymentChannelAdded = 'PaymentChannelAdded',
  PaymentChannelUpdated = 'PaymentChannelUpdated',
  EmployeeInvited = 'EmployeeInvited',
  EmployeeUpdated = 'EmployeeUpdated',
  BusinessInfoUpdated = 'BusinessInfoUpdated',
  StationDocumentUploaded = 'StationDocumentUploaded',
  StationDocumentDeleted = 'StationDocumentDeleted',
  VerificationSubmitted = 'VerificationSubmitted',
  StationApproved = 'StationApproved',
  StationRejected = 'StationRejected',
}

/** One place that decides the category of each activity, so the two can never disagree. */
export const ACTIVITY_CATEGORY_BY_TYPE: Readonly<Record<ActivityType, ActivityCategory>> = {
  [ActivityType.SignedIn]: ActivityCategory.Security,
  [ActivityType.SignInFailed]: ActivityCategory.Security,
  [ActivityType.SignedOut]: ActivityCategory.Security,
  [ActivityType.DeviceSignedOut]: ActivityCategory.Security,
  [ActivityType.OtherDevicesSignedOut]: ActivityCategory.Security,
  [ActivityType.PasswordSet]: ActivityCategory.Security,
  [ActivityType.PasswordChanged]: ActivityCategory.Security,
  [ActivityType.TwoFactorEnabled]: ActivityCategory.Security,
  [ActivityType.TwoFactorDisabled]: ActivityCategory.Security,
  [ActivityType.RecoveryCodesRegenerated]: ActivityCategory.Security,

  [ActivityType.AvatarChanged]: ActivityCategory.Profile,
  [ActivityType.AvatarRemoved]: ActivityCategory.Profile,
  [ActivityType.ProfileUpdated]: ActivityCategory.Profile,
  [ActivityType.CustomerDetailsUpdated]: ActivityCategory.Profile,
  [ActivityType.ContractSigned]: ActivityCategory.Profile,

  [ActivityType.OrderPlaced]: ActivityCategory.Orders,
  [ActivityType.OrderCancelled]: ActivityCategory.Orders,
  [ActivityType.OrderAccepted]: ActivityCategory.Orders,
  [ActivityType.OrderDeclined]: ActivityCategory.Orders,
  [ActivityType.OrderDelivered]: ActivityCategory.Orders,
  [ActivityType.OrderFailed]: ActivityCategory.Orders,

  [ActivityType.PaymentReferenceSent]: ActivityCategory.Payments,
  [ActivityType.CreditsSettled]: ActivityCategory.Payments,

  [ActivityType.ShiftStarted]: ActivityCategory.Shift,
  [ActivityType.ShiftEnded]: ActivityCategory.Shift,
  [ActivityType.ExpenseAdded]: ActivityCategory.Shift,
  [ActivityType.ExpenseDeleted]: ActivityCategory.Shift,

  [ActivityType.StationRegistered]: ActivityCategory.Station,
  [ActivityType.StationUpdated]: ActivityCategory.Station,
  [ActivityType.PaymentChannelAdded]: ActivityCategory.Station,
  [ActivityType.PaymentChannelUpdated]: ActivityCategory.Station,
  [ActivityType.EmployeeInvited]: ActivityCategory.Station,
  [ActivityType.EmployeeUpdated]: ActivityCategory.Station,
  [ActivityType.BusinessInfoUpdated]: ActivityCategory.Station,
  [ActivityType.StationDocumentUploaded]: ActivityCategory.Station,
  [ActivityType.StationDocumentDeleted]: ActivityCategory.Station,
  [ActivityType.VerificationSubmitted]: ActivityCategory.Station,
  [ActivityType.StationApproved]: ActivityCategory.Station,
  [ActivityType.StationRejected]: ActivityCategory.Station,
};
