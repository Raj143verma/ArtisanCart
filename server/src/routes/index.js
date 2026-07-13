import { Router } from 'express';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';
import categoryRoutes from './category.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/categories', categoryRoutes);

// Future route modules will attach here.

export default router;
