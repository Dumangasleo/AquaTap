import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { queryRows } from '../../common/utils/sql-query.util';
import { UserRole } from '../../common/enums/domain.enums';
import { AccountAccess, AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { normalizeEmail, normalizeFullName } from '../../common/utils/text.util';
import { Employee } from '../employees/employee.entity';
import { currentDateTime } from '../../common/utils/date-time.util';
import { AppConfig } from '../../config/app-config';
import { UserAccount } from './user-account.entity';

/** Identity confirmed by a trusted provider (Google) or by the developer sign-in. */
export interface VerifiedIdentity {
  email: string;
  googleSubject: string | null;
  fullName: string | null;
  photoUrl: string | null;
}

/** Outcome of checking the account and the device session behind an access token. */
export type RequestIdentityResolution =
  | { status: 'Active'; user: AuthenticatedUser; sessionLastActiveAt: Date }
  /** The account was disabled or deleted. */
  | { status: 'AccountUnavailable' }
  /** The device was signed out, or its session expired. */
  | { status: 'SessionEnded' };

/** Profile details that are not loaded with the account by default. */
export interface AccountProfileDetails {
  avatarImage: string | null;
  hasPassword: boolean;
}

/** Either key finds one account. */
export type AccountLookup = { userAccountId: number } | { email: string };

interface AccountAccessRow {
  UserAccountID: number;
  Email: string;
  FullName: string | null;
  UserRole: UserRole | null;
  WaterStationID: number | null;
  IsActive: number;
  EmployeeID: number | null;
  EmployeeIsActive: number | null;
  IsOwner: number | null;
  CustomerID: number | null;
  UserSessionID: number | null;
  DeviceName: string | null;
  SessionLastActiveAt: Date | null;
}

@Injectable()
export class UserAccountsService {
  constructor(
    @InjectRepository(UserAccount) private readonly userAccountRepository: Repository<UserAccount>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  findById(userAccountId: number): Promise<UserAccount | null> {
    return this.userAccountRepository.findOne({ where: { userAccountId } });
  }

  /**
   * Loads the account together with its password hash and (encrypted) two-step verification secret.
   * Those columns are hidden from normal queries; only the sign-in and security services need them.
   */
  findWithCredentials(lookup: AccountLookup): Promise<UserAccount | null> {
    const query = this.userAccountRepository
      .createQueryBuilder('account')
      .addSelect(['account.passwordHash', 'account.twoFactorSecret']);

    return 'email' in lookup
      ? query.where('account.email = :email', { email: normalizeEmail(lookup.email) }).getOne()
      : query
          .where('account.userAccountId = :userAccountId', { userAccountId: lookup.userAccountId })
          .getOne();
  }

  async getProfileDetails(userAccountId: number): Promise<AccountProfileDetails> {
    const [row] = await queryRows<{ AvatarImage: string | null; HasPassword: number }>(
      this.dataSource,
      `SELECT AvatarImage, PasswordHash IS NOT NULL AS HasPassword FROM UserAccount WHERE UserAccountID = ?`,
      [userAccountId],
    );
    return { avatarImage: row?.AvatarImage ?? null, hasPassword: Number(row?.HasPassword ?? 0) === 1 };
  }

  /**
   * Finds the account by Google subject first, then by email, and creates it when it does not exist yet.
   * Also assigns automatic roles (employee invitation, AquaTap reviewer).
   */
  async findOrCreateFromIdentity(identity: VerifiedIdentity): Promise<UserAccount> {
    const email = normalizeEmail(identity.email);
    let account =
      (identity.googleSubject
        ? await this.userAccountRepository.findOne({ where: { googleSubject: identity.googleSubject } })
        : null) ?? (await this.userAccountRepository.findOne({ where: { email } }));

    if (!account) {
      account = this.userAccountRepository.create({
        email,
        googleSubject: identity.googleSubject,
        fullName: identity.fullName ? normalizeFullName(identity.fullName) : null,
        photoUrl: identity.photoUrl,
        userRole: null,
        waterStationId: null,
        isActive: true,
      });
    } else {
      account.googleSubject = account.googleSubject ?? identity.googleSubject;
      account.photoUrl = identity.photoUrl ?? account.photoUrl;
    }

    account = await this.userAccountRepository.save(account);
    return this.applyAutomaticRole(account);
  }

  /** Called when a device session starts: remembers the sign-in and clears the wrong-attempt counter. */
  async recordSuccessfulSignIn(userAccountId: number): Promise<void> {
    await this.userAccountRepository.update(userAccountId, {
      lastLoginAt: currentDateTime(),
      failedSignInCount: 0,
      signInLockedUntil: null,
    });
  }

  /**
   * Roles that are given automatically instead of through onboarding:
   * - SYSTEM_ADMIN_EMAILS -> SystemAdmin (reviews station KYB documents)
   * - invited employee email -> Employee of that station
   */
  async applyAutomaticRole(account: UserAccount): Promise<UserAccount> {
    if (account.userRole !== null) return account;

    const systemAdminEmails = this.configService.get('auth.systemAdminEmails', { infer: true });
    if (systemAdminEmails.includes(account.email)) {
      await this.userAccountRepository.update(account.userAccountId, { userRole: UserRole.SystemAdmin });
      account.userRole = UserRole.SystemAdmin;
      return account;
    }
    return this.linkPendingEmployeeInvite(account);
  }

  /** When an admin invited this email as an employee, turn the account into an Employee account. */
  async linkPendingEmployeeInvite(account: UserAccount): Promise<UserAccount> {
    if (account.userRole !== null) return account;

    const invitedEmployee = await this.employeeRepository.findOne({
      where: { email: account.email, userAccountId: IsNull(), isActive: true },
    });
    if (!invitedEmployee) return account;

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Employee, invitedEmployee.employeeId, { userAccountId: account.userAccountId });
      await manager.update(UserAccount, account.userAccountId, {
        userRole: UserRole.Employee,
        waterStationId: invitedEmployee.waterStationId,
        fullName: account.fullName ?? invitedEmployee.fullName,
      });
    });

    account.userRole = UserRole.Employee;
    account.waterStationId = invitedEmployee.waterStationId;
    account.fullName = account.fullName ?? invitedEmployee.fullName;
    return account;
  }

  async updateFullName(userAccountId: number, fullName: string): Promise<string> {
    const normalizedFullName = normalizeFullName(fullName);
    await this.userAccountRepository.update(userAccountId, { fullName: normalizedFullName });
    return normalizedFullName;
  }

  async updateAvatarImage(userAccountId: number, avatarImage: string | null): Promise<void> {
    await this.userAccountRepository.update(userAccountId, { avatarImage });
  }

  /**
   * Used by JwtAuthGuard on every request: loads the account, its role links AND the device session
   * of the access token in one query.
   */
  async resolveAuthenticatedUser(
    userAccountId: number,
    userSessionId: number,
  ): Promise<RequestIdentityResolution> {
    const row = await this.loadAccountAccessRow(userAccountId, userSessionId);
    const accountAccess = row ? this.toAccountAccess(row) : null;
    if (!row || !accountAccess) return { status: 'AccountUnavailable' };

    if (row.UserSessionID === null || row.SessionLastActiveAt === null) return { status: 'SessionEnded' };

    return {
      status: 'Active',
      user: {
        ...accountAccess,
        userSessionId: row.UserSessionID,
        deviceName: row.DeviceName ?? 'Unknown device',
      },
      sessionLastActiveAt: row.SessionLastActiveAt,
    };
  }

  /** Role and station of an account, without checking a device session (used to build the profile). */
  async resolveAccountAccess(userAccountId: number): Promise<AccountAccess | null> {
    const row = await this.loadAccountAccessRow(userAccountId, null);
    return row ? this.toAccountAccess(row) : null;
  }

  private async loadAccountAccessRow(
    userAccountId: number,
    userSessionId: number | null,
  ): Promise<AccountAccessRow | null> {
    const rows = await queryRows<AccountAccessRow>(
      this.dataSource,
      `SELECT ua.UserAccountID, ua.Email, ua.FullName, ua.UserRole, ua.WaterStationID, ua.IsActive,
              e.EmployeeID, e.IsActive AS EmployeeIsActive, e.IsOwner,
              c.CustomerID,
              us.UserSessionID, us.DeviceName, us.LastActiveAt AS SessionLastActiveAt
         FROM UserAccount ua
         LEFT JOIN Employee e ON e.UserAccountID = ua.UserAccountID
         LEFT JOIN Customer c ON c.UserAccountID = ua.UserAccountID
         LEFT JOIN UserSession us ON us.UserSessionID = ?
                                 AND us.UserAccountID = ua.UserAccountID
                                 AND us.SignedOutAt IS NULL
                                 AND us.ExpiresAt > ?
        WHERE ua.UserAccountID = ?
        LIMIT 1`,
      [userSessionId, currentDateTime(), userAccountId],
    );
    return rows[0] ?? null;
  }

  /** null = the account (or its employee record) is disabled. */
  private toAccountAccess(row: AccountAccessRow): AccountAccess | null {
    if (!row.IsActive) return null;

    const isStaff = row.UserRole === UserRole.Admin || row.UserRole === UserRole.Employee;
    if (isStaff && row.EmployeeIsActive === 0) return null;

    return {
      userAccountId: row.UserAccountID,
      email: row.Email,
      fullName: row.FullName,
      role: row.UserRole,
      waterStationId: row.WaterStationID,
      employeeId: isStaff ? row.EmployeeID : null,
      customerId: row.UserRole === UserRole.Customer ? row.CustomerID : null,
      isOwner: row.IsOwner === 1,
    };
  }
}
