import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { migrate } from './db.js';
import authRouter from './routes/auth.js';
import gameRouter from './routes/game.js';
import scoresRouter from './routes/scores.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await migrate();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, health checks) are allowed.
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  }),
);

app.use(express.json({ limit: '32kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/game', apiLimiter, gameRouter);
app.use('/api/scores', apiLimiter, scoresRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Serve the production build when it exists, so the whole app can run from
// a single Express process after `npm run build`.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  if (error?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body.' });
  }

  const status = error.status || 500;
  if (status >= 500) console.error('[api]', error);

  return res.status(status).json({
    error: error.expose ? error.message : 'Something went wrong. Please try again.',
  });
});

const server = app.listen(config.port, () => {
  console.log(`🍌 API listening on http://localhost:${config.port}`);
  if (fs.existsSync(clientDist)) {
    console.log('   Serving the built client from client/dist');
  }
});

function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
