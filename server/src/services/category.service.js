import { CategoryRepository } from '../repositories/category.repository.js';
import { slugify, appendSuffix } from '../utils/slugUtils.js';
import { Category } from '../models/category.model.js';

async function ensureUniqueSlug(parent, baseSlug, excludeId = null) {
  let slug = baseSlug;
  let i = 0;
  while (true) {
    const existing = await Category.findOne({ parent: parent || null, slug, deletedAt: null, _id: { $ne: excludeId } });
    if (!existing) return slug;
    i += 1;
    slug = appendSuffix(baseSlug, i);
  }
}

export const CategoryService = {
  create: async (payload, userId = null) => {
    const baseSlug = slugify(payload.name);
    const slug = await ensureUniqueSlug(payload.parent || null, baseSlug);

    const ancestors = [];
    let path = slug;
    let depth = 0;
    if (payload.parent) {
      const parent = await CategoryRepository.findById(payload.parent);
      if (!parent) throw new Error('Parent not found');
      ancestors.push(...(parent.ancestors || []), parent._id);
      path = `${parent.path}/${slug}`;
      depth = (parent.depth || 0) + 1;
    }

    const doc = await CategoryRepository.create({
      ...payload,
      slug,
      ancestors,
      path,
      depth,
      createdBy: userId,
    });
    return doc;
  },

  update: async (id, payload, userId = null) => {
    const category = await CategoryRepository.findById(id);
    if (!category) throw new Error('Category not found');

    const updateData = { ...payload, updatedBy: userId };

    // Normalise empty string parent to null so Mongoose does not attempt
    // to cast '' to ObjectId, which would throw a CastError.
    if ('parent' in updateData && !updateData.parent) {
      updateData.parent = null;
    }

    if ('parent' in payload) {
      const parentId = payload.parent;
      if (parentId) {
        if (String(parentId) === String(id)) throw new Error('Parent cannot be self');
        const newParent = await CategoryRepository.findById(parentId);
        if (!newParent) throw new Error('Parent not found');
        if ((newParent.path || '').startsWith(category.path || '')) {
          throw new Error('Parent cannot be a descendant of the category');
        }
      }
    }

    if (payload.name && payload.name !== category.name) {
      updateData.slug = await ensureUniqueSlug(
        'parent' in payload ? payload.parent : category.parent,
        slugify(payload.name),
        id
      );
    }

    const newParentId = 'parent' in payload ? payload.parent : category.parent;
    const newSlug = updateData.slug || category.slug;

    if ('parent' in payload || newSlug !== category.slug) {
      let newAncestors = [];
      let newPath = newSlug;
      let newDepth = 0;

      if (newParentId) {
        const parent = await CategoryRepository.findById(newParentId);
        newAncestors = [...(parent.ancestors || []), parent._id];
        newPath = `${parent.path}/${newSlug}`;
        newDepth = (parent.depth || 0) + 1;
      }

      updateData.ancestors = newAncestors;
      updateData.path = newPath;
      updateData.depth = newDepth;

      const descendants = await Category.find({ path: { $regex: `^${category.path}/` } });
      for (const d of descendants) {
        const relativePath = d.path.substring(category.path.length);
        const updatedDescendantPath = `${newPath}${relativePath}`;
        
        // Ancestors above the updated category are replaced by the new hierarchy.
        // Ancestors below it (intermediate nodes between the updated category and
        // this descendant) are structurally unchanged — only their own records
        // get updated in subsequent iterations; their IDs remain the same.
        const categoryIdStr = String(category._id);
        const categoryIdx = (d.ancestors || []).findIndex((a) => String(a) === categoryIdStr);
        const relativeAncestors = categoryIdx !== -1 ? (d.ancestors || []).slice(categoryIdx + 1) : [];
        const newDescAncestors = [...newAncestors, category._id, ...relativeAncestors];

        await Category.findByIdAndUpdate(d._id, {
          path: updatedDescendantPath,
          ancestors: newDescAncestors,
          depth: d.depth - category.depth + newDepth,
        });
      }
    }

    return await CategoryRepository.updateById(id, updateData);
  },

  getById: async (id) => CategoryRepository.findById(id),

  list: async (query = {}, opts = {}) => {
    const filter = { deletedAt: null };
    if (query.q) filter.$text = { $search: query.q };
    if (query.slug) filter.slug = query.slug;
    if (typeof query.featured !== 'undefined') filter.isFeatured = query.featured;
    if (typeof query.active !== 'undefined') filter.isActive = query.active;
    if (query.parent) filter.parent = query.parent;

    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;
    const docs = await CategoryRepository.list(filter, { skip, limit, sort: { displayOrder: 1 } });
    return docs;
  },

  getTree: async () => {
    const cats = await Category.find({ deletedAt: null }).sort({ displayOrder: 1 }).lean();
    const map = new Map();
    cats.forEach((c) => map.set(String(c._id), { ...c, children: [] }));
    const roots = [];
    for (const c of cats) {
      if (c.parent) {
        const parent = map.get(String(c.parent));
        if (parent) parent.children.push(map.get(String(c._id)));
      } else {
        roots.push(map.get(String(c._id)));
      }
    }
    return roots;
  },

  softDelete: async (id, userId = null) => {
    const cat = await CategoryRepository.softDelete(id);
    if (cat) await Category.findByIdAndUpdate(id, { updatedBy: userId });
    return cat;
  },

  restore: async (id, userId = null) => {
    const cat = await CategoryRepository.restore(id);
    if (cat) await Category.findByIdAndUpdate(id, { updatedBy: userId });
    return cat;
  },

  toggleFeatured: async (id, value, userId = null) => {
    const cat = await CategoryRepository.updateById(id, { isFeatured: value, updatedBy: userId });
    return cat;
  },

  toggleActive: async (id, value, userId = null) => {
    const cat = await CategoryRepository.updateById(id, { isActive: value, updatedBy: userId });
    return cat;
  },
};
