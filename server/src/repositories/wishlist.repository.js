import mongoose from 'mongoose';
import { Wishlist } from '../models/wishlist.model.js';

export const WishlistRepository = {
  findByUserId: (userId) => 
    Wishlist.findOne({ user: userId }),

  addItem: (userId, productId, variantId) =>
    Wishlist.findOneAndUpdate(
      {
        user: userId,
        'items.249': { $exists: false },
        items: {
          $not: {
            $elemMatch: {
              product: productId,
              variant: variantId
            }
          }
        }
      },
      {
        $push: {
          items: {
            product: productId,
            variant: variantId,
            addedAt: new Date()
          }
        }
      },
      { new: true }
    ),

  removeItem: (userId, productId, variantId) =>
    Wishlist.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId, variant: variantId } } },
      { new: true }
    ),

  clear: (userId) =>
    Wishlist.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { new: true }
    ),

  checkItem: async (userId, productId, variantId) => {
    const count = await Wishlist.countDocuments({
      user: userId,
      items: {
        $elemMatch: { product: productId, variant: variantId }
      }
    });
    return count > 0;
  },

  countItems: async (userId) => {
    const wishlist = await Wishlist.findOne({ user: userId });
    return wishlist ? wishlist.items.length : 0;
  },

  getPaginatedItems: async (userId, skip, limit) => {
    return Wishlist.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'stores',
          localField: 'productInfo.store',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      { $unwind: '$storeInfo' },
      {
        $lookup: {
          from: 'productvariants',
          localField: 'items.variant',
          foreignField: '_id',
          as: 'variantInfo'
        }
      },
      { $unwind: '$variantInfo' },
      {
        $match: {
          'productInfo.deletedAt': null,
          'productInfo.status': 'published',
          'productInfo.isActive': true,
          'storeInfo.deletedAt': null,
          'storeInfo.status': 'active',
          'variantInfo.deletedAt': null,
          'variantInfo.isActive': true
        }
      },
      { $sort: { 'items.addedAt': -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                addedAt: '$items.addedAt',
                product: {
                  _id: '$productInfo._id',
                  title: '$productInfo.title',
                  slug: '$productInfo.slug',
                  images: '$productInfo.images',
                  basePrice: '$productInfo.basePrice',
                  currency: '$productInfo.currency',
                  isActive: '$productInfo.isActive'
                },
                variant: {
                  _id: '$variantInfo._id',
                  variantSku: '$variantInfo.sku',
                  price: '$variantInfo.price',
                  attributes: '$variantInfo.attributes',
                  isActive: '$variantInfo.isActive'
                },
                store: {
                  _id: '$storeInfo._id',
                  name: '$storeInfo.name',
                  slug: '$storeInfo.slug',
                  status: '$storeInfo.status',
                  isActive: '$storeInfo.isApproved'
                }
              }
            }
          ]
        }
      }
    ]);
  }
};
