import { Router } from 'express';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);

// Future route modules will attach here.

export default router;
