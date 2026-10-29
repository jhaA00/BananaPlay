import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env regardless of where the process was started from.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`[config] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[config] Copy server/.env.example to server/.env and fill in the values.');
  process.exit(1);
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  bananaApiUrl: process.env.BANANA_API_URL || 'https://marcconrad.com/uob/banana/api.php',
};
