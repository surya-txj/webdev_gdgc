import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, (req, res) => res.json(req.user));
export default router;
