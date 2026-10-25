import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError, asyncRoute, errors } from '../utils/errors.js';

const router = Router();
const paintingSchema = z.object({
  title: z.string().trim().min(2).max(160),
  artist: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  medium: z.string().trim().max(120).optional().nullable(),
  dimensions: z.string().trim().max(120).optional().nullable(),
  year: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  price: z.coerce.number().min(0).max(99999999),
  imageUrl: z.string().trim().max(1000).optional().nullable()
});

router.get('/', asyncRoute(async (req, res) => {
  const status = ['available', 'sold'].includes(req.query.status) ? req.query.status : null;
  const query = String(req.query.q || '').trim();
  let request = supabaseAdmin.from('paintings').select('*').order('created_at', { ascending: false });
  if (status) request = request.eq('status', status);
  if (query) request = request.or(`title.ilike.%${query}%,artist.ilike.%${query}%,medium.ilike.%${query}%`);
  const { data, error } = await request;
  if (error) throw error;
  res.json(data || []);
}));

router.get('/images', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const bucket = process.env.STORAGE_BUCKET || 'paintings';
  const { data, error } = await supabaseAdmin.storage.from(bucket).list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw error;
  const images = (data || []).filter((file) => file.name && !file.name.endsWith('/')).map((file) => ({
    name: file.name,
    url: supabaseAdmin.storage.from(bucket).getPublicUrl(file.name).data.publicUrl
  }));
  res.json(images);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('paintings').select('*').eq('id', req.params.id).maybeSingle();
  if (error) throw error;
  if (!data) throw errors.notFound();
  res.json(data);
}));

router.post('/', requireAuth, requireAdmin, validate(paintingSchema), asyncRoute(async (req, res) => {
  const payload = { ...req.body, image_url: req.body.imageUrl ?? null };
  delete payload.imageUrl;
  const { data, error } = await supabaseAdmin.from('paintings').insert(payload).select().single();
  if (error) throw error;
  res.status(201).json(data);
}));

router.patch('/:id', requireAuth, requireAdmin, validate(paintingSchema.partial()), asyncRoute(async (req, res) => {
  const { data: existing, error: findError } = await supabaseAdmin.from('paintings').select('status').eq('id', req.params.id).maybeSingle();
  if (findError) throw findError;
  if (!existing) throw errors.notFound();
  if (existing.status !== 'available') throw new AppError(409, 'PAINTING_NOT_EDITABLE', "Sold paintings can't be edited.");
  const payload = { ...req.body, image_url: req.body.imageUrl ?? undefined, updated_at: new Date().toISOString() };
  delete payload.imageUrl;
  const { data, error } = await supabaseAdmin.from('paintings').update(payload).eq('id', req.params.id).eq('status', 'available').select().maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(409, 'PAINTING_NOT_EDITABLE', "Sold paintings can't be edited.");
  res.json(data);
}));

export default router;
