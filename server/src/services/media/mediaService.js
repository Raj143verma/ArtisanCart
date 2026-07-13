import cloudinary from '../../utils/cloudinaryClient.js';
import streamifier from 'streamifier';

export async function uploadBufferToCloudinary(buffer, folder = '', publicId = undefined) {
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'image',
      overwrite: false,
    };
    if (publicId) options.public_id = publicId;

    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}
