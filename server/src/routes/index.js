import { Router } from 'express';
import authRoutes from './auth.routes.js';
import mediaRoutes from './media.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/media', mediaRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

// Future route modules will attach here.

export default router;
