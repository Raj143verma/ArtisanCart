import { ProductRepository } from '../repositories/product.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { Store } from '../models/store.model.js';
import { Product } from '../models/product.model.js';
import { slugify, appendSuffix } from '../utils/slugUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from './media/mediaService.js';
import { sanitizePublicId, buildCloudinaryFolder } from '../helpers/mediaHelper.js';

async function ensureUniqueProductSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let i = 0;
  while (true) {
    const existing = await Product.findOne({ slug, deletedAt: null, _id: { $ne: excludeId } });
    if (!existing) return slug;
    i += 1;
    slug = appendSuffix(baseSlug, i);
  }
}

async function verifyStoreOwnershipAndStatus(userId, productStoreId = null) {
  const store = await Store.findOne({ owner: userId });
  if (!store) {
    throw new ApiError(404, 'Store not found. You must create a store before managing products.');
  }
  if (!store.isApproved) {
    throw new ApiError(403, 'Your store is pending approval. You cannot list or manage products.');
  }
  if (productStoreId && String(productStoreId) !== String(store._id)) {
    throw new ApiError(403, 'Unauthorized access to this product.');
  }
  return store;
}

export const ProductService = {
  create: async (payload, userId) => {
    // 1. Verify seller owns a store and store is approved
    const store = await verifyStoreOwnershipAndStatus(userId);
    
    // 2. Normalise category -> categories array
    if (payload.category) {
      payload.categories = [payload.category];
      delete payload.category;
    }
    
    // 3. Verify all categories exist
    if (!payload.categories || payload.categories.length === 0) {
      throw new ApiError(400, 'At least one valid category is required.');
    }
    for (const catId of payload.categories) {
      const cat = await CategoryRepository.findById(catId);
      if (!cat) {
        throw new ApiError(404, `Category not found: ${catId}`);
      }
    }
    
    // 4. Generate unique slug
    const baseSlug = slugify(payload.title);
    const slug = await ensureUniqueProductSlug(baseSlug);
    
    // 5. Create doc
    const doc = await ProductRepository.create({
      ...payload,
      store: store._id,
      slug,
      status: 'draft', // Product always starts as Draft
      createdBy: userId,
    });
    return doc;
  },

  update: async (id, payload, userId, userRole) => {
    // 1. Fetch product
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }
    
    // 2. Check store ownership (except for Super Admin)
    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }
    
    // 3. Normalise categories
    if (payload.category) {
      payload.categories = [payload.category];
      delete payload.category;
    }
    
    // 4. Verify categories if updating
    if (payload.categories) {
      if (payload.categories.length === 0) {
        throw new ApiError(400, 'At least one valid category is required.');
      }
      for (const catId of payload.categories) {
        const cat = await CategoryRepository.findById(catId);
        if (!cat) {
          throw new ApiError(404, `Category not found: ${catId}`);
        }
      }
    }
    
    // 5. If title changed, regenerate slug
    const updateData = { ...payload, updatedBy: userId };
    if (payload.title && payload.title !== product.title) {
      const baseSlug = slugify(payload.title);
      updateData.slug = await ensureUniqueProductSlug(baseSlug, id);
    }
    
    // 6. Update product
    const updated = await ProductRepository.updateById(id, updateData);
    return updated;
  },

  softDelete: async (id, userId, userRole) => {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }
    
    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }
    
    const doc = await ProductRepository.softDelete(id);
    if (doc) {
      await Product.findByIdAndUpdate(id, { updatedBy: userId });
    }
    return doc;
  },

  restore: async (id, userId, userRole) => {
    const product = await ProductRepository.findByIdWithDeleted(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }
    
    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }
    
    const doc = await ProductRepository.restore(id);
    if (doc) {
      await Product.findByIdAndUpdate(id, { updatedBy: userId });
    }
    return doc;
  },

  getById: async (id) => {
    return ProductRepository.findById(id);
  },

  list: async (query = {}, opts = {}) => {
    const filter = { deletedAt: null };
    
    if (query.q) filter.$text = { $search: query.q };
    if (query.slug) filter.slug = query.slug;
    if (typeof query.featured !== 'undefined') filter.isFeatured = query.featured;
    if (typeof query.active !== 'undefined') filter.isActive = query.active;
    if (query.status) filter.status = query.status;
    if (query.category) filter.categories = query.category;
    if (query.store) filter.store = query.store;
    
    if (query.minPrice || query.maxPrice) {
      filter.basePrice = {};
      if (query.minPrice) filter.basePrice.$gte = query.minPrice;
      if (query.maxPrice) filter.basePrice.$lte = query.maxPrice;
    }
    
    if (query.tags) {
      const tagsArr = query.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagsArr.length > 0) {
        filter.tags = { $in: tagsArr };
      }
    }
    
    let sort = { createdAt: -1 };
    if (opts.sort) {
      switch (opts.sort) {
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'price_asc':
          sort = { basePrice: 1 };
          break;
        case 'price_desc':
          sort = { basePrice: -1 };
          break;
        case 'featured':
          sort = { isFeatured: -1, createdAt: -1 };
          break;
        case 'newest':
        default:
          sort = { createdAt: -1 };
      }
    }
    
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;
    
    const docs = await ProductRepository.list(filter, { skip, limit, sort });
    const total = await ProductRepository.count(filter);
    
    return {
      docs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  },

  uploadImages: async (id, files, userId, userRole) => {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const currentCount = product.images ? product.images.length : 0;
    if (currentCount + files.length > 10) {
      throw new ApiError(
        400,
        `Maximum 10 images are allowed per product. You currently have ${currentCount} images.`,
      );
    }

    const folder = buildCloudinaryFolder('product');
    const uploadedImages = [];
    let hasThumbnail = product.images && product.images.some((img) => img.isThumbnail);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const publicId = sanitizePublicId(file.originalname);
        const uploadResult = await uploadBufferToCloudinary(file.buffer, folder, publicId);

        const isThumbnail = !hasThumbnail && i === 0;
        if (isThumbnail) {
          hasThumbnail = true;
        }

        uploadedImages.push({
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url || uploadResult.url,
          isThumbnail,
          displayOrder: currentCount + i,
          metadata: {
            width: uploadResult.width,
            height: uploadResult.height,
            bytes: uploadResult.bytes,
            format: uploadResult.format,
          },
        });
      }

      product.images.push(...uploadedImages);
      await product.save();
    } catch (error) {
      for (const img of uploadedImages) {
        await deleteFromCloudinary(img.public_id);
      }
      throw error;
    }

    return product.images;
  },

  deleteImage: async (id, imageId, userId, userRole) => {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const imageIndex = product.images.findIndex((img) => String(img._id) === String(imageId));
    if (imageIndex === -1) {
      throw new ApiError(404, 'Image not found in this product.');
    }

    const imageToDelete = product.images[imageIndex];

    product.images.splice(imageIndex, 1);

    if (imageToDelete.isThumbnail && product.images.length > 0) {
      product.images[0].isThumbnail = true;
    }

    product.images.forEach((img, idx) => {
      img.displayOrder = idx;
    });

    await product.save();

    // Delete from Cloudinary only after successful DB save
    await deleteFromCloudinary(imageToDelete.public_id);

    return product.images;
  },

  replaceImage: async (id, imageId, file, userId, userRole) => {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const image = product.images.find((img) => String(img._id) === String(imageId));
    if (!image) {
      throw new ApiError(404, 'Image not found in this product.');
    }

    const oldPublicId = image.public_id;

    // Upload new image first
    const folder = buildCloudinaryFolder('product');
    const publicId = sanitizePublicId(file.originalname);
    const uploadResult = await uploadBufferToCloudinary(file.buffer, folder, publicId);

    try {
      image.public_id = uploadResult.public_id;
      image.url = uploadResult.secure_url || uploadResult.url;
      image.metadata = {
        width: uploadResult.width,
        height: uploadResult.height,
        bytes: uploadResult.bytes,
        format: uploadResult.format,
      };

      await product.save();
    } catch (error) {
      // If DB save fails, clean up the newly uploaded image from Cloudinary
      await deleteFromCloudinary(uploadResult.public_id);
      throw error;
    }

    // Delete old image from Cloudinary only after successful save
    await deleteFromCloudinary(oldPublicId);

    return product.images;
  },

  setThumbnail: async (id, imageId, userId, userRole) => {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const imageExists = product.images.some((img) => String(img._id) === String(imageId));
    if (!imageExists) {
      throw new ApiError(404, 'Image not found in this product.');
    }

    product.images.forEach((img) => {
      img.isThumbnail = String(img._id) === String(imageId);
    });

    await product.save();
    return product.images;
  },
};
