import { EntityManager } from 'typeorm';

/** A row of a raw SQL result: column name -> value (MySQL returns DECIMAL / SUM values as strings). */
export type SqlRow = Record<string, string | number | Date | null>;

/** Anything that can run raw SQL: the DataSource or a transaction's EntityManager. */
export type QueryExecutor = Pick<EntityManager, 'query'>;

/**
 * Typed wrapper for raw SQL (reports, ledgers). TypeORM's `query()` returns `any` by default;
 * this keeps the result typed so mistakes are caught at compile time.
 */
export function queryRows<TRow extends object = SqlRow>(
  executor: QueryExecutor,
  sql: string,
  parameters: unknown[] = [],
): Promise<TRow[]> {
  return executor.query<TRow[]>(sql, parameters);
}
