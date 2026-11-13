import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { queryRows } from '../../common/utils/sql-query.util';
import { PaymentMode, PaymentStatus, PaymentType } from '../../common/enums/domain.enums';

export interface GallonBalance {
  borrowedGallons: number;
  gallonsDelivered: number;
  gallonsReturned: number;
  /** borrowed + delivered - returned : containers of the station currently held by the customer */
  remainingGallons: number;
}

export interface GallonLedgerEntry {
  entryType: 'Contract' | 'Delivery';
  referenceId: number;
  orderNumber: string | null;
  entryDate: Date;
  borrowedGallons: number;
  gallonsOrdered: number;
  returnedGallons: number;
  remainingGallons: number;
  totalAmount: number;
  paymentType: PaymentType | null;
  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus | null;
}

export interface StationRecordQuery {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface StationRecordRow {
  customerOrderId: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  employeeName: string | null;
  deliveredAt: Date;
  gallonsOrdered: number;
  returnedGallons: number;
  remainingGallons: number;
  totalAmount: number;
  paymentType: PaymentType;
  paymentMode: PaymentMode | null;
  paymentStatus: PaymentStatus;
}

/**
 * Single source of truth for gallon computations ("solid computation").
 *   Remaining = SUM(contract borrowed) + SUM(delivered gallons) - SUM(returned empties)
 * Columns are UNSIGNED in MySQL, so subtraction always CASTs to SIGNED first.
 */
@Injectable()
export class GallonLedgerService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getGallonBalance(customerId: number, manager?: EntityManager): Promise<GallonBalance> {
    const executor = manager ?? this.dataSource.manager;
    const [row] = await queryRows(
      executor,
      `SELECT
          (SELECT COALESCE(SUM(gc.BorrowedGallons), 0) FROM GallonContract gc WHERE gc.CustomerID = ?) AS BorrowedGallons,
          COALESCE(SUM(o.GallonsOrdered), 0)  AS GallonsDelivered,
          COALESCE(SUM(o.ReturnedGallons), 0) AS GallonsReturned
         FROM CustomerOrder o
        WHERE o.CustomerID = ? AND o.OrderStatus = 'Delivered'`,
      [customerId, customerId],
    );

    const borrowedGallons = Number(row.BorrowedGallons);
    const gallonsDelivered = Number(row.GallonsDelivered);
    const gallonsReturned = Number(row.GallonsReturned);
    return {
      borrowedGallons,
      gallonsDelivered,
      gallonsReturned,
      remainingGallons: borrowedGallons + gallonsDelivered - gallonsReturned,
    };
  }

  /** Chronological history: contract(s) first, then each delivered order with the running remaining gallons. */
  async getCustomerLedger(customerId: number): Promise<GallonLedgerEntry[]> {
    const contractRows: Array<{ GallonContractID: number; SignedAt: Date; BorrowedGallons: number }> =
      await queryRows(
        this.dataSource,
        `SELECT GallonContractID, SignedAt, BorrowedGallons
           FROM GallonContract WHERE CustomerID = ? ORDER BY SignedAt, GallonContractID`,
        [customerId],
      );

    const orderRows: Array<{
      CustomerOrderID: number;
      OrderNumber: string;
      DeliveredAt: Date;
      GallonsOrdered: number;
      ReturnedGallons: number;
      TotalAmount: string;
      PaymentType: PaymentType;
      PaymentMode: PaymentMode | null;
      PaymentStatus: PaymentStatus;
    }> = await queryRows(
      this.dataSource,
      `SELECT CustomerOrderID, OrderNumber, DeliveredAt, GallonsOrdered, ReturnedGallons, TotalAmount,
              PaymentType, PaymentMode, PaymentStatus
         FROM CustomerOrder
        WHERE CustomerID = ? AND OrderStatus = 'Delivered'
        ORDER BY DeliveredAt, CustomerOrderID`,
      [customerId],
    );

    const entries: GallonLedgerEntry[] = [];
    let runningRemaining = 0;

    for (const contract of contractRows) {
      runningRemaining += Number(contract.BorrowedGallons);
      entries.push({
        entryType: 'Contract',
        referenceId: contract.GallonContractID,
        orderNumber: null,
        entryDate: contract.SignedAt,
        borrowedGallons: Number(contract.BorrowedGallons),
        gallonsOrdered: 0,
        returnedGallons: 0,
        remainingGallons: runningRemaining,
        totalAmount: 0,
        paymentType: null,
        paymentMode: null,
        paymentStatus: null,
      });
    }

    for (const order of orderRows) {
      runningRemaining += Number(order.GallonsOrdered) - Number(order.ReturnedGallons);
      entries.push({
        entryType: 'Delivery',
        referenceId: order.CustomerOrderID,
        orderNumber: order.OrderNumber,
        entryDate: order.DeliveredAt,
        borrowedGallons: 0,
        gallonsOrdered: Number(order.GallonsOrdered),
        returnedGallons: Number(order.ReturnedGallons),
        remainingGallons: runningRemaining,
        totalAmount: Number(order.TotalAmount),
        paymentType: order.PaymentType,
        paymentMode: order.PaymentMode,
        paymentStatus: order.PaymentStatus,
      });
    }

    return entries;
  }

  /**
   * Station-wide records grid: Name | Gallons Ordered | Returned | Remaining | Cash/Credit | Mode.
   * Remaining is computed from the very beginning (window function over ALL deliveries of each customer),
   * then the date / name filters are applied on top.
   */
  async getStationRecords(waterStationId: number, query: StationRecordQuery): Promise<StationRecordRow[]> {
    const conditions: string[] = [];
    const filterParameters: unknown[] = [];

    if (query.dateFrom) {
      conditions.push('DATE(ledger.DeliveredAt) >= ?');
      filterParameters.push(query.dateFrom);
    }
    if (query.dateTo) {
      conditions.push('DATE(ledger.DeliveredAt) <= ?');
      filterParameters.push(query.dateTo);
    }
    if (query.search?.trim()) {
      conditions.push('(ledger.CustomerName LIKE ? OR ledger.OrderNumber LIKE ?)');
      const searchPattern = `%${query.search.trim()}%`;
      filterParameters.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows: Array<Record<string, unknown>> = await queryRows(
      this.dataSource,
      `SELECT * FROM (
          SELECT o.CustomerOrderID, o.OrderNumber, o.CustomerID, c.FullName AS CustomerName,
                 e.FullName AS EmployeeName, o.DeliveredAt, o.GallonsOrdered, o.ReturnedGallons,
                 o.TotalAmount, o.PaymentType, o.PaymentMode, o.PaymentStatus,
                 COALESCE(gc.BorrowedGallons, 0)
                   + SUM(CAST(o.GallonsOrdered AS SIGNED) - CAST(o.ReturnedGallons AS SIGNED))
                       OVER (PARTITION BY o.CustomerID ORDER BY o.DeliveredAt, o.CustomerOrderID) AS RemainingGallons
            FROM CustomerOrder o
            JOIN Customer c ON c.CustomerID = o.CustomerID
            LEFT JOIN Employee e ON e.EmployeeID = o.EmployeeID
            LEFT JOIN (SELECT CustomerID, SUM(BorrowedGallons) AS BorrowedGallons
                         FROM GallonContract GROUP BY CustomerID) gc ON gc.CustomerID = o.CustomerID
           WHERE o.WaterStationID = ? AND o.OrderStatus = 'Delivered'
       ) ledger
       ${whereClause}
       ORDER BY ledger.DeliveredAt DESC, ledger.CustomerOrderID DESC
       LIMIT ?`,
      [waterStationId, ...filterParameters, query.limit ?? 200],
    );

    return rows.map((row) => ({
      customerOrderId: Number(row.CustomerOrderID),
      orderNumber: String(row.OrderNumber),
      customerId: Number(row.CustomerID),
      customerName: String(row.CustomerName),
      employeeName: (row.EmployeeName as string | null) ?? null,
      deliveredAt: row.DeliveredAt as Date,
      gallonsOrdered: Number(row.GallonsOrdered),
      returnedGallons: Number(row.ReturnedGallons),
      remainingGallons: Number(row.RemainingGallons),
      totalAmount: Number(row.TotalAmount),
      paymentType: row.PaymentType as PaymentType,
      paymentMode: (row.PaymentMode as PaymentMode | null) ?? null,
      paymentStatus: row.PaymentStatus as PaymentStatus,
    }));
  }
}
