import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireAdmin, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError, asyncRoute, errors } from '../utils/errors.js';
import { addDays, daysBetween, todayIST } from '../utils/dates.js';

const router = Router();
const requestSchema = z.object({
  itemId: z.string().uuid(),
  glazeId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(12, 'Quantity cannot exceed 12.'),
  neededBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  notes: z.string().trim().max(1000).optional().nullable()
});

async function enrich(rows = []) {
  const itemIds = [...new Set(rows.map((row) => row.item_id))];
  const glazeIds = [...new Set(rows.map((row) => row.glaze_id))];
  const customerIds = [...new Set(rows.map((row) => row.customer_id))];
  const [{ data: items }, { data: glazes }, { data: customers }] = await Promise.all([
    supabaseAdmin.from('pottery_items').select('*').in('id', itemIds.length ? itemIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseAdmin.from('glazes').select('*').in('id', glazeIds.length ? glazeIds : ['00000000-0000-0000-0000-000000000000']),
    supabaseAdmin.from('profiles').select('id,full_name').in('id', customerIds.length ? customerIds : ['00000000-0000-0000-0000-000000000000'])
  ]);
  const itemMap = new Map((items || []).map((item) => [item.id, item]));
  const glazeMap = new Map((glazes || []).map((item) => [item.id, item]));
  const customerMap = new Map((customers || []).map((item) => [item.id, item]));
  return rows.map((row) => {
    const item = itemMap.get(row.item_id) || null;
    const glaze = glazeMap.get(row.glaze_id) || null;
    const estimatedPrice = item?.price != null ? Number(item.price) * row.quantity + (glaze?.price != null ? Number(glaze.price) : 0) : null;
    return { ...row, item, glaze, customer: customerMap.get(row.customer_id) || null, estimatedPrice };
  });
}

async function validateNeededBy(value) {
  const distance = daysBetween(todayIST(), value);
  if (distance === null || distance < 14) throw errors.validation({ neededBy: 'Choose a date at least 14 days from today.' });
}

router.get('/options', asyncRoute(async (_req, res) => {
  const [{ data: items, error: itemError }, { data: glazes, error: glazeError }] = await Promise.all([
    supabaseAdmin.from('pottery_items').select('*').order('name'),
    supabaseAdmin.from('glazes').select('*').order('name')
  ]);
  if (itemError || glazeError) throw itemError || glazeError;
  res.json({ items: items || [], glazes: glazes || [], minNeededBy: addDays(todayIST(), 14) });
}));

router.use(requireAuth);
router.get('/requests', asyncRoute(async (req, res) => {
  let query = supabaseAdmin.from('pottery_requests').select('*').order('created_at', { ascending: false });
  if (req.user.role === 'customer') query = query.eq('customer_id', req.user.id);
  const { data, error } = await query;
  if (error) throw error;
  res.json(await enrich(data || []));
}));

router.get('/requests/:id', asyncRoute(async (req, res) => {
  let query = supabaseAdmin.from('pottery_requests').select('*').eq('id', req.params.id);
  if (req.user.role === 'customer') query = query.eq('customer_id', req.user.id);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) throw errors.notFound();
  res.json((await enrich([data]))[0]);
}));

async function validateForeignKeys(itemId, glazeId) {
  const [{ data: item }, { data: glaze }] = await Promise.all([
    supabaseAdmin.from('pottery_items').select('id').eq('id', itemId).maybeSingle(),
    supabaseAdmin.from('glazes').select('id').eq('id', glazeId).maybeSingle()
  ]);
  if (!item) throw errors.validation({ itemId: 'Choose a pottery item.' });
  if (!glaze) throw errors.validation({ glazeId: 'Choose a glaze.' });
}

router.post('/requests', requireCustomer, validate(requestSchema), asyncRoute(async (req, res) => {
  await validateNeededBy(req.body.neededBy);
  await validateForeignKeys(req.body.itemId, req.body.glazeId);
  const { data, error } = await supabaseAdmin.from('pottery_requests').insert({ customer_id: req.user.id, item_id: req.body.itemId, glaze_id: req.body.glazeId, quantity: req.body.quantity, needed_by: req.body.neededBy, notes: req.body.notes || null }).select().single();
  if (error) throw error;
  res.status(201).json((await enrich([data]))[0]);
}));

router.patch('/requests/:id', requireCustomer, validate(requestSchema), asyncRoute(async (req, res) => {
  await validateNeededBy(req.body.neededBy);
  await validateForeignKeys(req.body.itemId, req.body.glazeId);
  const { data, error } = await supabaseAdmin.from('pottery_requests').update({ item_id: req.body.itemId, glaze_id: req.body.glazeId, quantity: req.body.quantity, needed_by: req.body.neededBy, notes: req.body.notes || null, updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('customer_id', req.user.id).eq('status', 'requested').select().maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current } = await supabaseAdmin.from('pottery_requests').select('id').eq('id', req.params.id).eq('customer_id', req.user.id).maybeSingle();
    if (!current) throw errors.notFound();
    throw new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  }
  res.json((await enrich([data]))[0]);
}));

router.post('/requests/:id/cancel', requireCustomer, asyncRoute(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('pottery_requests').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', req.params.id).eq('customer_id', req.user.id).eq('status', 'requested').select().maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current } = await supabaseAdmin.from('pottery_requests').select('id').eq('id', req.params.id).eq('customer_id', req.user.id).maybeSingle();
    if (!current) throw errors.notFound();
    throw new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  }
  res.json(data);
}));

async function decide(id, status, res) {
  const { data, error } = await supabaseAdmin.from('pottery_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'requested').select().maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: current } = await supabaseAdmin.from('pottery_requests').select('id').eq('id', id).maybeSingle();
    if (!current) throw errors.notFound();
    throw new AppError(409, 'INVALID_STATUS', "This can't be changed anymore — its status has already been updated.");
  }
  return res.json(data);
}
router.post('/requests/:id/accept', requireAdmin, asyncRoute(async (req, res) => decide(req.params.id, 'accepted', res)));
router.post('/requests/:id/decline', requireAdmin, asyncRoute(async (req, res) => decide(req.params.id, 'declined', res)));

export default router;
