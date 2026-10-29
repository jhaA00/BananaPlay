import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetUrl = new URL(config.databaseUrl);
const databaseName = targetUrl.pathname.replace(/^\//, '');

if (!databaseName) {
  console.error('[setup] DATABASE_URL must include a database name.');
  process.exit(1);
}

// Connect to the default maintenance database to create the app database.
const adminUrl = new URL(targetUrl);
adminUrl.pathname = '/postgres';

const admin = new pg.Client({ connectionString: adminUrl.toString() });

try {
  await admin.connect();
  const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);

  if (existing.rowCount === 0) {
    const quoted = `"${databaseName.replace(/"/g, '""')}"`;
    await admin.query(`CREATE DATABASE ${quoted}`);
    console.log(`[setup] Created database "${databaseName}".`);
  } else {
    console.log(`[setup] Database "${databaseName}" already exists.`);
  }
} finally {
  await admin.end();
}

const appDb = new pg.Client({ connectionString: config.databaseUrl });
try {
  await appDb.connect();
  const schema = fs.readFileSync(path.resolve(__dirname, '../src/schema.sql'), 'utf8');
  await appDb.query(schema);
  console.log('[setup] Schema is up to date. You are ready to play! 🍌');
} finally {
  await appDb.end();
}
