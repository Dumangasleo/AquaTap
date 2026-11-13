/**
 * npm run db:test:reset
 *
 * Drops and recreates the AUTOMATED TEST database (default: aquatap_test_db) from
 * database/aquatap_schema.sql, so the API tests always start from an empty database.
 * Safety: it refuses any database whose name does not end with "_test_db",
 * so the real data in aquatap_db can never be deleted by this script.
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

const DEFAULT_DATABASE_NAME = 'aquatap_db';
const TEST_DATABASE_SUFFIX = '_test_db';

process.loadEnvFile(resolve(import.meta.dirname, '..', '.env'));

const testDatabaseName = process.env.TEST_DB_NAME?.trim() || 'aquatap_test_db';
if (!/^[A-Za-z0-9_]+$/.test(testDatabaseName) || !testDatabaseName.endsWith(TEST_DATABASE_SUFFIX)) {
  console.error(`Refusing to reset "${testDatabaseName}": the name must end with "${TEST_DATABASE_SUFFIX}".`);
  process.exit(1);
}

const schemaFilePath = resolve(import.meta.dirname, '..', '..', 'database', 'aquatap_schema.sql');
const schemaSql = (await readFile(schemaFilePath, 'utf8')).replaceAll(
  new RegExp(`\\b${DEFAULT_DATABASE_NAME}\\b`, 'g'),
  testDatabaseName,
);

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
  timezone: '+08:00',
});

try {
  await connection.query(`DROP DATABASE IF EXISTS \`${testDatabaseName}\``);
  await connection.query(schemaSql);
  console.log(`✔ Test database ${testDatabaseName} was recreated from aquatap_schema.sql`);
} catch (error) {
  console.error(`✖ Could not reset ${testDatabaseName}:`, error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
