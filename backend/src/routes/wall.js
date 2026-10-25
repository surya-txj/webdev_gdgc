import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireAdmin, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError, asyncRoute, errors, mapDatabaseError } from '../utils/errors.js';
import { addDays, daysBetween, todayIST } from '../utils/dates.js';

const router = Router();
const bookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  wallSizeSqft: z.coerce.number().int().min(10, 'Wall size must be at least 10 sq ft.').max(500, 'Wall size cannot exceed 500 sq ft.'),
  address: z.string().trim().min(5, 'Address must be at least 5 characters.').max(300, 'Address cannot exceed 300 characters.')
});

async function wallRate() {
  const { data, error } = await supabaseAdmin.from('settings').select('value').eq('key', 'wall_rate_per_sqft').maybeSingle();
  if (error) throw error;
  return Number(data?.value || 150);
}

async function enrichBookings(rows = []) {
  const ids = [...new Set(rows.map((row) => row.customer_id))];
  const { data: customers } = await supabaseAdmin.from('profiles').select('id,full_name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  const map = new Map((customers || []).map((item) => [item.id, item]));
  return rows.map((row) => ({ ...row, customer: map.get(row.customer_id) || null }));
}

router.get('/rate', asyncRoute(async (_req, res) => res.json({ ratePerSqft: await wallRate(), currency: 'INR' })));

router.get('/taken-dates', requireAuth, asyncRoute(async (req, res) => {
  const from = req.query.from || todayIST();
  const to = req.query.to || addDays(from, 90);
  const { data, error } = await supabaseAdmin.from('wall_bookings').select('booking_date').in('status', ['requested', 'confirmed']).gte('booking_date', from).lte('booking_date', to);
  if (error) throw error;
  res.json((data || []).map((row) => row.booking_date));
}));

router.use('/bookings', requireAuth);
router.get('/bookings', asyncRoute(async (req, res) => {
  let query = supabaseAdmin.from('wall_bookings').select('*').order('booking_date', { ascending: true });
  if (req.user.role === 'customer') query = query.eq('customer_id', req.user.id);
  const { data, error } = await query;
  if (error) throw error;
  res.json(await enrichBookings(data || []));
}));

router.get('/bookings/:id', asyncRoute(async (req, res) => {
  let query = supabaseAdmin.from('wall_bookings').select('*').eq('id', req.params.id);
  if (req.user.role === 'customer') query = query.eq('customer_id', req.user.id);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw errors.notFound();
  res.json((await enrichBookings([data]))[0]);
}));

router.post('/bookings', requireCustomer, validate(bookingSchema), asyncRoute(async (req, res) => {
  const today = todayIST();
  const distance = daysBetween(today, req.body.date);
  if (distance === null || distance < 7 || distance > 90) throw errors.validation({ date: 'Choose a date 7 to 90 days from today.' });
  const rate = await wallRate();
  const { data, error } = await supabaseAdmin.from('wall_bookings').insert({
    customer_id: req.user.id,
    booking_date: req.body.date,
    wall_size_sqft: req.body.wallSizeSqft,
    address: req.body.address,
    rate_per_sqft: rate,
    price: rate * req.body.wallSizeSqft
  }).select().single();
  if (error) throw mapDatabaseError(error);
  res.status(201).json(data);
}));

async function updateRequested(id, status, res) {
  const { data, error } = await supabaseAdmin.from('wall_bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'requested').select().maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current } = await supabaseAdmin.from('wall_bookings').select('id').eq('id', id).maybeSingle();
    if (!current) throw errors.notFound();
    throw new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  }
  return res.json(data);
}

router.post('/bookings/:id/confirm', requireAdmin, asyncRoute(async (req, res) => updateRequested(req.params.id, 'confirmed', res)));
router.post('/bookings/:id/decline', requireAdmin, asyncRoute(async (req, res) => updateRequested(req.params.id, 'declined', res)));

router.post('/bookings/:id/cancel', requireCustomer, asyncRoute(async (req, res) => {
  const { data: current, error: findError } = await supabaseAdmin.from('wall_bookings').select('*').eq('id', req.params.id).eq('customer_id', req.user.id).maybeSingle();
  if (findError) throw findError;
  if (!current) throw errors.notFound();
  if (!['requested', 'confirmed'].includes(current.status)) throw new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  if ((daysBetween(todayIST(), current.booking_date) ?? 0) < 3) throw new AppError(409, 'CANCEL_WINDOW_PASSED', 'Bookings can only be cancelled up to 3 days before the date.');
  const { data, error } = await supabaseAdmin.from('wall_bookings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('customer_id', req.user.id).in('status', ['requested', 'confirmed']).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  res.json(data);
}));

export default router;
