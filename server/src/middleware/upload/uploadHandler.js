import { uploadBufferToCloudinary, deleteFromCloudinary } from '../../services/media/mediaService.js';
import { buildCloudinaryFolder, sanitizePublicId } from '../../helpers/mediaHelper.js';
import { createSuccessResponse, createErrorResponse } from '../../helpers/responseHelper.js';

export async function handleUpload(req, res) {
  try {
    const { folder, originalname, buffer } = req.media;
    const target = buildCloudinaryFolder(folder);
    const publicId = sanitizePublicId(originalname);

    const result = await uploadBufferToCloudinary(buffer, target, publicId);
    return res.json(createSuccessResponse({ url: result.secure_url, public_id: result.public_id }, 'Upload successful'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Upload failed'));
  }
}

export async function handleDelete(req, res) {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json(createErrorResponse('publicId required'));
    const result = await deleteFromCloudinary(publicId);
    return res.json(createSuccessResponse(result, 'Delete successful'));
  } catch (error) {
    return res.status(500).json(createErrorResponse('Delete failed'));
  }
}
