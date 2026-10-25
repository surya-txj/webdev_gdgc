import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import paintings from './routes/paintings.js';
import orders from './routes/orders.js';
import wall from './routes/wall.js';
import pottery from './routes/pottery.js';
import admin from './routes/admin.js';
import me from './routes/me.js';
import { AppError } from './utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = Number(process.env.PORT || 4000);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.get('/api/health', (_req, res) => res.json({ ok: true, supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) }));
app.use('/api/me', me);
app.use('/api/paintings', paintings);
app.use('/api/orders', orders);
app.use('/api/wall', wall);
app.use('/api/wall-bookings', (req, res, next) => { req.url = `/bookings${req.url === '/' ? '' : req.url}`; wall(req, res, next); });
app.use('/api/pottery', pottery);
app.use('/api/pottery-requests', (req, res, next) => { req.url = `/requests${req.url === '/' ? '' : req.url}`; pottery(req, res, next); });
app.use('/api/admin', admin);
app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', "We couldn't find that.")));
app.use((error, _req, res, _next) => {
  const status = error instanceof AppError ? error.status : 500;
  const payload = error instanceof AppError ? { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } : { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' };
  if (status >= 500) console.error(error);
  res.status(status).json({ error: payload });
});

app.listen(port, '0.0.0.0', () => console.log(`Art Studio server listening on ${port}`));
export default app;
