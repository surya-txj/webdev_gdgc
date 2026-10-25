import { Router } from 'express';
import { supabaseAdmin } from '../supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncRoute } from '../utils/errors.js';
import { todayIST } from '../utils/dates.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', asyncRoute(async (_req, res) => {
  const [available, sold, placed, bookings, pottery, upcoming, orders] = await Promise.all([
    supabaseAdmin.from('paintings').select('id', { count: 'exact', head: true }).eq('status', 'available'),
    supabaseAdmin.from('paintings').select('id', { count: 'exact', head: true }).eq('status', 'sold'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed'),
    supabaseAdmin.from('wall_bookings').select('status'),
    supabaseAdmin.from('pottery_requests').select('status'),
    supabaseAdmin.from('wall_bookings').select('*').eq('status', 'confirmed').gte('booking_date', todayIST()).order('booking_date').limit(5),
    supabaseAdmin.from('orders').select('price,status,created_at').order('created_at', { ascending: false }).limit(8)
  ]);
  const queryError = [available, sold, placed, bookings, pottery, upcoming, orders].find((result) => result.error)?.error;
  if (queryError) throw queryError;
  const countStatuses = (rows) => (rows || []).reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  const totalOrderValue = (orders.data || []).filter((row) => row.status === 'placed').reduce((sum, row) => sum + Number(row.price || 0), 0);
  res.json({
    paintings: { available: available.count || 0, sold: sold.count || 0 },
    orders: { placed: placed.count || 0, totalValue: totalOrderValue },
    bookings: countStatuses(bookings.data),
    pottery: countStatuses(pottery.data),
    upcomingBookings: upcoming.data || [],
    recentOrders: orders.data || []
  });
}));

export default router;
