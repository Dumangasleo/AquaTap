/**
 * Runs a .sql file against the MySQL server configured in backend/.env.
 *   npm run db:setup    -> database/aquatap_schema.sql (creates aquatap_db and its tables)
 *   npm run db:seed     -> database/aquatap_seed.sql   (optional demo data)
 *   npm run db:migrate -- ../database/migrations/003_account_security.sql
 *
 * The SQL files are written for the database "aquatap_db". When DB_NAME is another name
 * (e.g. DB_NAME=aquatap_test_db for automated tests), the script runs them against that database instead.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

const DEFAULT_DATABASE_NAME = 'aquatap_db';

// Variables already set in the shell (e.g. DB_NAME=aquatap_test_db) win over backend/.env.
process.loadEnvFile(resolve(import.meta.dirname, '..', '.env'));

const sqlFilePath = process.argv[2];
if (!sqlFilePath) {
  console.error('Usage: node scripts/run-sql-file.mjs <path-to-sql-file>');
  process.exit(1);
}

const targetDatabaseName = process.env.DB_NAME?.trim() || DEFAULT_DATABASE_NAME;
if (!/^[A-Za-z0-9_]+$/.test(targetDatabaseName)) {
  console.error(`DB_NAME "${targetDatabaseName}" is not a valid database name (letters, numbers and _ only).`);
  process.exit(1);
}

const absoluteSqlFilePath = resolve(process.cwd(), sqlFilePath);
const originalSql = await readFile(absoluteSqlFilePath, 'utf8');
const sql =
  targetDatabaseName === DEFAULT_DATABASE_NAME
    ? originalSql
    : originalSql.replaceAll(new RegExp(`\\b${DEFAULT_DATABASE_NAME}\\b`, 'g'), targetDatabaseName);

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
  timezone: '+08:00',
});

try {
  await connection.query(sql);
  console.log(`✔ Executed ${absoluteSqlFilePath} on database ${targetDatabaseName}`);
} catch (error) {
  console.error(`✖ Failed to execute ${absoluteSqlFilePath} on database ${targetDatabaseName}:`, error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
