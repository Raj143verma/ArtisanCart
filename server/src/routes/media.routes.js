import { Router } from 'express';
import { singleUpload } from '../middleware/upload/uploadMiddleware.js';
import { handleUpload, handleDelete } from '../middleware/upload/uploadHandler.js';

const router = Router();

// Upload endpoint: frontend should POST multipart/form-data with field 'file' and query param ?type=product|store|user|review
router.post('/upload', (req, res, next) => {
  const type = req.query.type || 'misc';
  return singleUpload('file', type)(req, res, next);
}, handleUpload);

router.post('/delete', handleDelete);

export default router;
