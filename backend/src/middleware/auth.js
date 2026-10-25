import { supabaseAdmin } from '../supabase.js';
import { errors } from '../utils/errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!token) throw errors.unauthenticated();
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) throw errors.unauthenticated();
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('id, full_name, role').eq('id', authData.user.id).single();
    if (profileError || !profile) throw errors.unauthenticated();
    req.user = { id: authData.user.id, email: authData.user.email, full_name: profile.full_name, role: profile.role };
    next();
  } catch (error) { next(error); }
}

export function requireRole(role) {
  return (req, _res, next) => next(req.user?.role === role ? undefined : errors.forbidden());
}

export function requireCustomer(req, res, next) { return requireRole('customer')(req, res, next); }
export function requireAdmin(req, res, next) { return requireRole('admin')(req, res, next); }
