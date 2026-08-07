import { StoreRepository } from '../repositories/store.repository.js';
import { Store } from '../models/store.model.js';
import { Product } from '../models/product.model.js';
import { slugify, appendSuffix } from '../utils/slugUtils.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

async function ensureUniqueStoreSlug(baseSlug, excludeId = null) {
  let slug = baseSlug;
  let i = 0;
  while (true) {
    const existing = await Store.findOne({ slug, deletedAt: null, _id: { $ne: excludeId } });
    if (!existing) return slug;
    i += 1;
    slug = appendSuffix(baseSlug, i);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function checkNameUniqueness(name, excludeId = null) {
  const escapedName = escapeRegExp(name.trim());
  const existing = await Store.findOne({
    name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    deletedAt: null,
    _id: { $ne: excludeId },
  });
  if (existing) {
    throw new ApiError(400, 'A store with this name already exists.');
  }
}

export const StoreService = {
  create: async (payload, userId) => {
    // 1. Enforce ownership rule: One Seller owns exactly One Store
    const existingStore = await StoreRepository.findOneByOwner(userId);
    if (existingStore) {
      throw new ApiError(400, 'You already own an active store.');
    }

    // 2. Validate name uniqueness
    await checkNameUniqueness(payload.name);

    // 3. Generate unique slug
    const baseSlug = slugify(payload.name);
    const slug = await ensureUniqueStoreSlug(baseSlug);

    // 4. Create store document (defaults to draft status)
    const store = await StoreRepository.create({
      ...payload,
      owner: userId,
      slug,
      status: 'draft',
    });

    return store;
  },

  update: async (id, payload, userId, userRole) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    // Enforce ownership: Seller can only edit their own store, Super Admin can update any
    if (userRole !== Roles.SUPER_ADMIN && String(store.owner) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this store.');
    }

    const updateData = { ...payload };

    // Validate name uniqueness and update slug if name changes
    if (payload.name && payload.name !== store.name) {
      await checkNameUniqueness(payload.name, id);
      const baseSlug = slugify(payload.name);
      updateData.slug = await ensureUniqueStoreSlug(baseSlug, id);
    }

    // If critical fields are modified on an active store, move it back to pending approval
    if (store.status === 'active' && (payload.name || payload.gstNumber)) {
      updateData.status = 'pending_approval';
    }

    const updated = await StoreRepository.updateById(id, updateData);
    return updated;
  },

  submitForApproval: async (id, userId) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    if (String(store.owner) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this store.');
    }

    // Allowed transition: draft/rejected -> pending_approval
    if (store.status !== 'draft' && store.status !== 'rejected') {
      throw new ApiError(400, `Cannot submit store in status "${store.status}" for approval.`);
    }

    // Validate that mandatory profile fields are present
    if (!store.businessAddress || !store.email || !store.contactNumber) {
      throw new ApiError(400, 'Please complete the required profile fields (Business Address, Email, and Contact Number) before submitting.');
    }

    store.status = 'pending_approval';
    await store.save();
    return store;
  },

  approve: async (id) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    if (store.status !== 'pending_approval') {
      throw new ApiError(400, `Cannot approve a store in status "${store.status}".`);
    }

    store.status = 'active';
    store.rejectionReason = '';
    await store.save();

    // Re-activate previously published products of this store
    await Product.updateMany({ store: id, status: 'published' }, { isActive: true });

    return store;
  },

  reject: async (id, reason) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    if (store.status !== 'pending_approval') {
      throw new ApiError(400, `Cannot reject a store in status "${store.status}".`);
    }

    store.status = 'rejected';
    store.rejectionReason = reason;
    await store.save();
    return store;
  },

  suspend: async (id) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    if (store.status !== 'active') {
      throw new ApiError(400, 'Only active stores can be suspended.');
    }

    store.status = 'suspended';
    await store.save();

    // Disable visibility of all products belonging to this suspended store
    await Product.updateMany({ store: id }, { isActive: false });

    return store;
  },

  unsuspend: async (id) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    if (store.status !== 'suspended') {
      throw new ApiError(400, 'Only suspended stores can be unsuspended.');
    }

    store.status = 'active';
    await store.save();

    // Reactivate products that are published
    await Product.updateMany({ store: id, status: 'published' }, { isActive: true });

    return store;
  },

  softDelete: async (id, userId, userRole) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN && String(store.owner) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this store.');
    }

    const doc = await StoreRepository.softDelete(id);

    // Soft delete all active products belonging to this store using the exact same deletion date
    if (doc && doc.deletedAt) {
      await Product.updateMany({ store: id, deletedAt: null }, { deletedAt: doc.deletedAt });
    }

    return doc;
  },

  restore: async (id) => {
    const store = await StoreRepository.findByIdWithDeleted(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    const deletionDate = store.deletedAt;
    const doc = await StoreRepository.restore(id);

    // Restore only products that were cascade-deleted during store deletion (matching deletion timestamp)
    if (deletionDate) {
      await Product.updateMany({ store: id, deletedAt: deletionDate }, { deletedAt: null });
    }

    return doc;
  },

  getById: async (id, userId = null, userRole = null) => {
    const store = await StoreRepository.findById(id);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    // Public view is allowed only if the store is active. Draft/Suspended/Rejected require Owner or Admin.
    if (store.status !== 'active') {
      if (!userId || (userRole !== Roles.SUPER_ADMIN && String(store.owner) !== String(userId))) {
        throw new ApiError(403, 'Unauthorized access to this store.');
      }
    }

    return store;
  },

  getBySlug: async (slug, userId = null, userRole = null) => {
    const store = await StoreRepository.findOneBySlug(slug);
    if (!store) {
      throw new ApiError(404, 'Store not found.');
    }

    // Public view is allowed only if the store is active. Draft/Suspended/Rejected require Owner or Admin.
    if (store.status !== 'active') {
      if (!userId || (userRole !== Roles.SUPER_ADMIN && String(store.owner) !== String(userId))) {
        throw new ApiError(403, 'Unauthorized access to this store.');
      }
    }

    return store;
  },

  list: async (query, userId = null, userRole = null) => {
    const filter = { deletedAt: null };

    // Public view is restricted to active stores
    if (userRole !== Roles.SUPER_ADMIN) {
      filter.status = 'active';
    } else if (query.status) {
      // Admin can filter by status
      filter.status = query.status;
    }

    // Text search query
    if (query.q) {
      filter.$text = { $search: query.q };
    }

    // Sorting mapping
    let sort = { createdAt: -1 };
    if (query.sort === 'oldest') {
      sort = { createdAt: 1 };
    } else if (query.sort === 'name_asc') {
      sort = { name: 1 };
    } else if (query.sort === 'name_desc') {
      sort = { name: -1 };
    }

    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const items = await StoreRepository.list(filter, { sort, skip, limit });
    const total = await StoreRepository.count(filter);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  getByOwner: async (ownerId) => {
    const store = await StoreRepository.findOneByOwner(ownerId);
    if (!store) {
      throw new ApiError(404, 'Store not found for this seller.');
    }
    return store;
  },
};
