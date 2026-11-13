import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { queryRows } from '../../common/utils/sql-query.util';
import { SearchQueryDto } from '../../common/dto/common-query.dto';
import { UserRole } from '../../common/enums/domain.enums';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { normalizeFullName } from '../../common/utils/text.util';
import { ContractTemplateService } from '../gallon-contracts/contract-template.service';
import { GallonContract } from '../gallon-contracts/gallon-contract.entity';
import { GallonLedgerEntry, GallonLedgerService } from '../gallon-contracts/gallon-ledger.service';
import { UserAccount } from '../user-accounts/user-account.entity';
import { WaterStationsService } from '../water-stations/water-stations.service';
import { Customer } from './customer.entity';
import {
  CustomerAccountResponse,
  CustomerCreditSummary,
  CustomerListItemResponse,
  RegisterCustomerDto,
  UpdateCustomerProfileDto,
} from './dto/customer.dto';
import { currentDateTime } from '../../common/utils/date-time.util';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    @InjectRepository(GallonContract) private readonly gallonContractRepository: Repository<GallonContract>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly waterStationsService: WaterStationsService,
    private readonly contractTemplateService: ContractTemplateService,
    private readonly gallonLedgerService: GallonLedgerService,
  ) {}

  /**
   * Customer onboarding (electronic contract): saves the customer details, the signed borrowing
   * contract (with the first borrowed gallons) and links the account to the chosen station.
   */
  async registerCustomer(
    user: AuthenticatedUser,
    registerDto: RegisterCustomerDto,
  ): Promise<CustomerAccountResponse> {
    if (user.role !== null) {
      throw new ConflictException('Your account is already set up.');
    }

    const station = await this.waterStationsService.findVerifiedStationOrThrow(registerDto.waterStationId);
    const fullName = normalizeFullName(registerDto.fullName);
    const occupation = registerDto.occupation?.trim() || null;
    const signedAt = currentDateTime();

    const customer = await this.dataSource.transaction(async (manager) => {
      const newCustomer = await manager.save(
        manager.create(Customer, {
          waterStationId: station.waterStationId,
          userAccountId: user.userAccountId,
          fullName,
          address: registerDto.address.trim(),
          occupation,
          contactNumber: registerDto.contactNumber.trim(),
          landmark: registerDto.landmark?.trim() || null,
          latitude: registerDto.latitude ?? null,
          longitude: registerDto.longitude ?? null,
        }),
      );

      const contractBody = registerDto.useContractTemplate
        ? this.contractTemplateService.render(
            this.contractTemplateService.resolveTemplate(station.contractTemplate),
            {
              fullName,
              address: newCustomer.address,
              occupation,
              contactNumber: newCustomer.contactNumber,
              borrowedGallons: registerDto.borrowedGallons,
              stationName: station.stationName,
              signedAt,
            },
          )
        : null;

      await manager.save(
        manager.create(GallonContract, {
          customerId: newCustomer.customerId,
          waterStationId: station.waterStationId,
          fullName,
          address: newCustomer.address,
          occupation,
          contactNumber: newCustomer.contactNumber,
          borrowedGallons: registerDto.borrowedGallons,
          contractBody,
          signatureSvg: registerDto.signatureSvg,
          signedAt,
        }),
      );

      await manager.update(UserAccount, user.userAccountId, {
        userRole: UserRole.Customer,
        waterStationId: station.waterStationId,
        fullName,
      });

      return newCustomer;
    });

    return this.getCustomerAccount(station.waterStationId, customer.customerId);
  }

  async listCustomers(waterStationId: number, query: SearchQueryDto): Promise<CustomerListItemResponse[]> {
    const searchPattern = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const rows: Array<Record<string, unknown>> = await queryRows(
      this.dataSource,
      `SELECT c.CustomerID, c.FullName, c.Address, c.ContactNumber, c.Landmark, c.CreatedAt,
              COALESCE(gc.BorrowedGallons, 0) AS BorrowedGallons,
              COALESCE(o.GallonsDelivered, 0)  AS GallonsDelivered,
              COALESCE(o.GallonsReturned, 0)   AS GallonsReturned,
              COALESCE(o.UnpaidBalance, 0)     AS UnpaidBalance,
              o.LastOrderAt
         FROM Customer c
         LEFT JOIN (SELECT CustomerID, SUM(BorrowedGallons) AS BorrowedGallons
                      FROM GallonContract GROUP BY CustomerID) gc ON gc.CustomerID = c.CustomerID
         LEFT JOIN (SELECT CustomerID,
                           SUM(CASE WHEN OrderStatus = 'Delivered' THEN GallonsOrdered ELSE 0 END)  AS GallonsDelivered,
                           SUM(CASE WHEN OrderStatus = 'Delivered' THEN ReturnedGallons ELSE 0 END) AS GallonsReturned,
                           SUM(CASE WHEN OrderStatus = 'Delivered' AND PaymentType = 'Credit' AND PaymentStatus = 'Unpaid'
                                    THEN TotalAmount ELSE 0 END) AS UnpaidBalance,
                           MAX(OrderedAt) AS LastOrderAt
                      FROM CustomerOrder WHERE WaterStationID = ? GROUP BY CustomerID) o ON o.CustomerID = c.CustomerID
        WHERE c.WaterStationID = ?
          AND (? IS NULL OR c.FullName LIKE ? OR c.ContactNumber LIKE ? OR c.Address LIKE ?)
        ORDER BY c.FullName
        LIMIT ?`,
      [
        waterStationId,
        waterStationId,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        query.limit ?? 200,
      ],
    );

    return rows.map((row) => ({
      customerId: Number(row.CustomerID),
      fullName: String(row.FullName),
      address: String(row.Address),
      contactNumber: String(row.ContactNumber),
      landmark: (row.Landmark as string | null) ?? null,
      createdAt: row.CreatedAt as Date,
      remainingGallons:
        Number(row.BorrowedGallons) + Number(row.GallonsDelivered) - Number(row.GallonsReturned),
      unpaidBalance: Number(row.UnpaidBalance),
      lastOrderAt: (row.LastOrderAt as Date | null) ?? null,
    }));
  }

  async findCustomerInStationOrThrow(waterStationId: number, customerId: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { customerId, waterStationId } });
    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async getCustomerAccount(waterStationId: number, customerId: number): Promise<CustomerAccountResponse> {
    const customer = await this.findCustomerInStationOrThrow(waterStationId, customerId);
    const station = await this.waterStationsService.findActiveStationOrThrow(waterStationId);

    const [contract, gallonBalance, credit, orderCounts, email] = await Promise.all([
      this.gallonContractRepository.findOne({ where: { customerId }, order: { signedAt: 'DESC' } }),
      this.gallonLedgerService.getGallonBalance(customerId),
      this.getCreditSummary(customerId),
      this.getOrderCounts(customerId),
      this.findCustomerEmail(customer.userAccountId),
    ]);

    return {
      customerId: customer.customerId,
      waterStationId: customer.waterStationId,
      stationName: station.stationName,
      email,
      fullName: customer.fullName,
      address: customer.address,
      occupation: customer.occupation,
      contactNumber: customer.contactNumber,
      landmark: customer.landmark,
      latitude: customer.latitude,
      longitude: customer.longitude,
      createdAt: customer.createdAt,
      contract: contract
        ? {
            gallonContractId: contract.gallonContractId,
            fullName: contract.fullName,
            address: contract.address,
            occupation: contract.occupation,
            contactNumber: contract.contactNumber,
            borrowedGallons: contract.borrowedGallons,
            contractBody: contract.contractBody,
            signatureSvg: contract.signatureSvg,
            signedAt: contract.signedAt,
          }
        : null,
      gallonBalance,
      credit,
      totalOrders: orderCounts.totalOrders,
      activeOrders: orderCounts.activeOrders,
    };
  }

  async updateCustomerProfile(
    waterStationId: number,
    customerId: number,
    updateDto: UpdateCustomerProfileDto,
  ): Promise<CustomerAccountResponse> {
    const customer = await this.findCustomerInStationOrThrow(waterStationId, customerId);

    if (updateDto.address !== undefined) customer.address = updateDto.address.trim();
    if (updateDto.occupation !== undefined) customer.occupation = updateDto.occupation.trim() || null;
    if (updateDto.contactNumber !== undefined) customer.contactNumber = updateDto.contactNumber.trim();
    if (updateDto.landmark !== undefined) customer.landmark = updateDto.landmark.trim() || null;
    if (updateDto.latitude !== undefined) customer.latitude = updateDto.latitude;
    if (updateDto.longitude !== undefined) customer.longitude = updateDto.longitude;

    await this.customerRepository.save(customer);
    return this.getCustomerAccount(waterStationId, customerId);
  }

  async getCustomerLedger(waterStationId: number, customerId: number): Promise<GallonLedgerEntry[]> {
    await this.findCustomerInStationOrThrow(waterStationId, customerId);
    return this.gallonLedgerService.getCustomerLedger(customerId);
  }

  private async getCreditSummary(customerId: number): Promise<CustomerCreditSummary> {
    const [row] = await queryRows(
      this.dataSource,
      `SELECT
          COALESCE(SUM(CASE WHEN PaymentStatus = 'Unpaid' THEN TotalAmount ELSE 0 END), 0) AS UnpaidBalance,
          COALESCE(SUM(CASE WHEN PaymentStatus = 'Unpaid' THEN 1 ELSE 0 END), 0)           AS UnpaidOrderCount,
          COALESCE(SUM(CASE WHEN PaymentStatus = 'Paid' THEN TotalAmount ELSE 0 END), 0)   AS TotalPaid
         FROM CustomerOrder
        WHERE CustomerID = ? AND OrderStatus = 'Delivered'`,
      [customerId],
    );
    return {
      unpaidBalance: Number(row.UnpaidBalance),
      unpaidOrderCount: Number(row.UnpaidOrderCount),
      totalPaid: Number(row.TotalPaid),
    };
  }

  private async getOrderCounts(customerId: number): Promise<{ totalOrders: number; activeOrders: number }> {
    const [row] = await queryRows(
      this.dataSource,
      `SELECT COUNT(*) AS TotalOrders,
              COALESCE(SUM(CASE WHEN OrderStatus IN ('Pending', 'Accepted') THEN 1 ELSE 0 END), 0) AS ActiveOrders
         FROM CustomerOrder WHERE CustomerID = ?`,
      [customerId],
    );
    return { totalOrders: Number(row.TotalOrders), activeOrders: Number(row.ActiveOrders) };
  }

  private async findCustomerEmail(userAccountId: number | null): Promise<string | null> {
    if (userAccountId === null) return null;
    const account = await this.dataSource.manager.findOne(UserAccount, { where: { userAccountId } });
    return account?.email ?? null;
  }
}
