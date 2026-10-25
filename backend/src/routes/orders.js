import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError, asyncRoute, errors, mapDatabaseError } from '../utils/errors.js';

const router = Router();
const createSchema = z.object({ paintingId: z.string().uuid() });

async function enrichOrders(rows = []) {
  const paintingIds = [...new Set(rows.map((row) => row.painting_id))];
  const customerIds = [...new Set(rows.map((row) => row.customer_id))];
  const [{ data: paintings }, { data: customers }] = await Promise.all([
    supabaseAdmin.from('paintings').select('id,title,image_url').in('id', paintingIds.length ? paintingIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseAdmin.from('profiles').select('id,full_name').in('id', customerIds.length ? customerIds : ['00000000-0000-0000-0000-000000000000'])
  ]);
  const paintingMap = new Map((paintings || []).map((item) => [item.id, item]));
  const customerMap = new Map((customers || []).map((item) => [item.id, item]));
  return rows.map((row) => ({ ...row, painting: paintingMap.get(row.painting_id) || null, customer: customerMap.get(row.customer_id) || null }));
}

router.use(requireAuth);

router.get('/', asyncRoute(async (req, res) => {
  let query = supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });
  if (req.user.role === 'customer') query = query.eq('customer_id', req.user.id);
  const { data, error } = await query;
  if (error) throw error;
  res.json(await enrichOrders(data || []));
}));

router.get('/:id', asyncRoute(async (req, res) => {
  let query = supabaseAdmin.from('orders').select('*').eq('id', req.params.id);
  if (req.user.role === 'customer') query = query.eq('customer_id', req.user.id);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw errors.notFound();
  res.json((await enrichOrders([data]))[0]);
}));

router.post('/', requireCustomer, validate(createSchema), asyncRoute(async (req, res) => {
  const { data, error } = await supabaseAdmin.rpc('place_order', { p_painting_id: req.body.paintingId, p_customer_id: req.user.id });
  if (error) throw mapDatabaseError(error);
  res.status(201).json(data);
}));

router.post('/:id/cancel', requireCustomer, asyncRoute(async (req, res) => {
  const { data, error } = await supabaseAdmin.rpc('cancel_order', { p_order_id: req.params.id, p_customer_id: req.user.id });
  if (error) throw mapDatabaseError(error);
  if (!data) throw new AppError(404, 'NOT_FOUND', "We couldn't find that.");
  res.json(data);
}));

export default router;
