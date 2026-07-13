import multer from 'multer';
import { createErrorResponse } from '../../helpers/responseHelper.js';
import path from 'path';

const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
  const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
  err.message = 'Invalid file type';
  return cb(err, false);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

export function singleUpload(fieldName = 'file', folder = '') {
  return (req, res, next) => {
    const handler = upload.single(fieldName);
    handler(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          const message = err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds limit' : err.message || 'Invalid file upload';
          return res.status(400).json(createErrorResponse(message));
        }
        return res.status(400).json(createErrorResponse('File upload failed'));
      }

      if (!req.file) {
        return res.status(400).json(createErrorResponse('File is required'));
      }

      // Expose folder target and basic file metadata for downstream handlers
      req.media = {
        folder,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      };

      next();
    });
  };
}

export function multipleUpload(fieldName = 'files', maxCount = 10, folder = '') {
  return (req, res, next) => {
    const handler = upload.array(fieldName, maxCount);
    handler(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          const message =
            err.code === 'LIMIT_FILE_SIZE'
              ? 'File size exceeds limit'
              : err.message || 'Invalid file upload';
          return res.status(400).json(createErrorResponse(message));
        }
        return res.status(400).json(createErrorResponse('File upload failed'));
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json(createErrorResponse('Files are required'));
      }

      // Expose folder target and basic files metadata for downstream handlers
      req.mediaFiles = req.files.map((file) => ({
        folder,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      }));

      next();
    });
  };
}
