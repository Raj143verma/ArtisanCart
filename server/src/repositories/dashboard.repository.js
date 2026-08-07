import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { Order } from '../models/order.model.js';
import { Inventory } from '../models/inventory.model.js';

export const DashboardRepository = {
  getOverviewMetrics: async (storeId) => {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const result = await Product.aggregate([
      { $match: { store: storeObjectId, deletedAt: null } },
      {
        $lookup: {
          from: 'inventories',
          localField: '_id',
          foreignField: 'product',
          as: 'inventoryDocs'
        }
      },
      {
        $lookup: {
          from: 'productvariants',
          localField: '_id',
          foreignField: 'product',
          as: 'variantDocs'
        }
      },
      {
        $facet: {
          products: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
                draft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
                suspended: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$isActive", false] },
                          { $nin: ["$status", ["draft", "archived", "rejected"]] }
                        ]
                      },
                      1,
                      0
                    ]
                  }
                },
                outOfStock: { $sum: { $cond: [{ $lte: ["$stockQuantity", 0] }, 1, 0] } },
                lowStock: { $sum: { $cond: [{ $in: ["low_stock", "$inventoryDocs.status"] }, 1, 0] } }
              }
            },
            {
              $project: {
                _id: 0,
                total: 1,
                active: 1,
                draft: 1,
                suspended: 1,
                outOfStock: 1,
                lowStock: 1
              }
            }
          ],
          variants: [
            { $unwind: "$variantDocs" },
            { $match: { "variantDocs.deletedAt": null } },
            { $count: "count" }
          ],
          categories: [
            { $unwind: "$categories" },
            { $group: { _id: "$categories" } },
            { $count: "count" }
          ]
        }
      }
    ]);

    const p = result[0]?.products[0] || { total: 0, active: 0, draft: 0, suspended: 0, outOfStock: 0, lowStock: 0 };
    const totalVariants = result[0]?.variants[0]?.count || 0;
    const totalCategories = result[0]?.categories[0]?.count || 0;

    return {
      totalProducts: p.total || 0,
      activeProducts: p.active || 0,
      draftProducts: p.draft || 0,
      suspendedProducts: p.suspended || 0,
      outOfStockProducts: p.outOfStock || 0,
      lowStockProducts: p.lowStock || 0,
      totalVariants,
      totalCategories
    };
  },

  getOrdersMetrics: async (sellerUserId) => {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerUserId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfSevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfThirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await Order.aggregate([
      { $match: { seller: sellerObjectId } },
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            },
            { $project: { status: "$_id", count: 1, _id: 0 } }
          ],
          periodicCounts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                today: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, 1, 0] } },
                weekly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfSevenDaysAgo] }, 1, 0] } },
                monthly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfThirtyDaysAgo] }, 1, 0] } }
              }
            },
            { $project: { _id: 0, total: 1, today: 1, weekly: 1, monthly: 1 } }
          ]
        }
      }
    ]);

    const statusCountsRaw = result[0]?.statusCounts || [];
    const periodic = result[0]?.periodicCounts[0] || { total: 0, today: 0, weekly: 0, monthly: 0 };

    const counts = {
      totalOrders: periodic.total || 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      todayOrders: periodic.today || 0,
      weeklyOrders: periodic.weekly || 0,
      monthlyOrders: periodic.monthly || 0
    };

    statusCountsRaw.forEach(item => {
      if (item.status in counts) {
        counts[item.status] = item.count;
      }
    });

    return counts;
  },

  getSalesMetrics: async (sellerUserId, storeId) => {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerUserId);
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfSevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfThirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await Order.aggregate([
      {
        $match: {
          seller: sellerObjectId,
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$pricing.subtotal" },
                totalOrders: { $sum: 1 },
                totalUnitsSold: {
                  $sum: {
                    $reduce: {
                      input: "$items",
                      initialValue: 0,
                      in: { $add: ["$$value", "$$this.quantity"] }
                    }
                  }
                }
              }
            },
            {
              $project: {
                _id: 0,
                totalRevenue: 1,
                totalUnitsSold: 1,
                averageOrderValue: {
                  $cond: [
                    { $gt: ["$totalOrders", 0] },
                    { $divide: ["$totalRevenue", "$totalOrders"] },
                    0
                  ]
                }
              }
            }
          ],
          periodicRevenue: [
            {
              $group: {
                _id: null,
                today: {
                  $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, "$pricing.subtotal", 0] }
                },
                weekly: {
                  $sum: { $cond: [{ $gte: ["$createdAt", startOfSevenDaysAgo] }, "$pricing.subtotal", 0] }
                },
                monthly: {
                  $sum: { $cond: [{ $gte: ["$createdAt", startOfThirtyDaysAgo] }, "$pricing.subtotal", 0] }
                }
              }
            },
            { $project: { _id: 0, today: 1, weekly: 1, monthly: 1 } }
          ]
        }
      }
    ]);

    const productsForVal = await Product.find({ store: storeObjectId, deletedAt: null }).select('_id');
    const productIdsForVal = productsForVal.map(p => p._id);

    const inventoryValResult = await Inventory.aggregate([
      { $match: { product: { $in: productIdsForVal } } },
      {
        $lookup: {
          from: 'productvariants',
          localField: 'variant',
          foreignField: '_id',
          as: 'variantDoc'
        }
      },
      { $unwind: "$variantDoc" },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$available", "$variantDoc.price"] } }
        }
      },
      { $project: { _id: 0, totalValue: 1 } }
    ]);

    const overall = result[0]?.overall[0] || { totalRevenue: 0, totalUnitsSold: 0, averageOrderValue: 0 };
    const periodic = result[0]?.periodicRevenue[0] || { today: 0, weekly: 0, monthly: 0 };
    const totalInventoryValue = inventoryValResult[0]?.totalValue || 0;

    return {
      todayRevenue: periodic.today || 0,
      weeklyRevenue: periodic.weekly || 0,
      monthlyRevenue: periodic.monthly || 0,
      totalRevenue: overall.totalRevenue || 0,
      averageOrderValue: overall.averageOrderValue || 0,
      totalUnitsSold: overall.totalUnitsSold || 0,
      totalInventoryValue
    };
  },

  getInventoryMetrics: async (storeId) => {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const products = await Product.find({ store: storeObjectId, deletedAt: null }).select('_id');
    const productIds = products.map(p => p._id);

    const result = await Inventory.aggregate([
      { $match: { product: { $in: productIds } } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalStock: { $sum: "$available" },
                totalItems: { $sum: 1 }
              }
            },
            { $project: { _id: 0, totalStock: 1, totalItems: 1 } }
          ],
          statuses: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            },
            { $project: { status: "$_id", count: 1, _id: 0 } }
          ]
        }
      }
    ]);

    const summary = result[0]?.summary[0] || { totalStock: 0, totalItems: 0 };
    const statusesRaw = result[0]?.statuses || [];

    const counts = {
      inStock: 0,
      lowStock: 0,
      outOfStock: 0
    };

    statusesRaw.forEach(item => {
      if (item.status === 'in_stock') counts.inStock = item.count;
      if (item.status === 'low_stock') counts.lowStock = item.count;
      if (item.status === 'out_of_stock') counts.outOfStock = item.count;
    });

    return {
      inventorySummary: {
        totalStock: summary.totalStock || 0,
        totalItems: summary.totalItems || 0,
        inStock: counts.inStock,
        lowStock: counts.lowStock,
        outOfStock: counts.outOfStock
      }
    };
  },

  getInventoryAlerts: async (storeId, alertType, page, limit) => {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const skip = (page - 1) * limit;

    const products = await Product.find({ store: storeObjectId, deletedAt: null }).select('_id title');
    const productIds = products.map(p => p._id);
    const productMap = {};
    products.forEach(p => {
      productMap[p._id.toString()] = p.title;
    });

    const items = await Inventory.aggregate([
      { $match: { product: { $in: productIds }, status: alertType } },
      {
        $lookup: {
          from: 'productvariants',
          localField: 'variant',
          foreignField: '_id',
          as: 'variantDoc'
        }
      },
      { $unwind: "$variantDoc" },
      { $sort: { available: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          available: 1,
          lowStockThreshold: 1,
          status: 1,
          productId: "$product",
          variantId: "$variantDoc._id",
          variantSku: "$variantDoc.sku",
          variantAttributes: "$variantDoc.attributes"
        }
      }
    ]);

    const itemsWithTitle = items.map(item => ({
      ...item,
      productTitle: productMap[item.productId.toString()] || ''
    }));

    const total = await Inventory.countDocuments({
      product: { $in: productIds },
      status: alertType
    });

    return {
      items: itemsWithTitle,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  },

  getProductPerformance: async (storeId, sellerUserId, filter, page, limit) => {
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const sellerObjectId = new mongoose.Types.ObjectId(sellerUserId);
    const skip = (page - 1) * limit;

    let items = [];
    let total = 0;

    if (filter === 'recently_added') {
      items = await Product.aggregate([
        { $match: { store: storeObjectId, deletedAt: null } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            slug: 1,
            basePrice: 1,
            createdAt: 1,
            images: 1,
            status: 1
          }
        }
      ]);

      total = await Product.countDocuments({ store: storeObjectId, deletedAt: null });
    } else if (filter === 'best_selling') {
      items = await Order.aggregate([
        { $match: { seller: sellerObjectId, status: { $ne: 'cancelled' } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDoc'
          }
        },
        { $unwind: "$productDoc" },
        {
          $project: {
            _id: 1,
            totalSold: 1,
            totalRevenue: 1,
            title: "$productDoc.title",
            slug: "$productDoc.slug",
            basePrice: "$productDoc.basePrice",
            images: "$productDoc.images"
          }
        }
      ]);

      const countRes = await Order.aggregate([
        { $match: { seller: sellerObjectId, status: { $ne: 'cancelled' } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.product" } },
        { $count: "count" }
      ]);
      total = countRes[0]?.count || 0;
    } else if (filter === 'never_sold') {
      items = await Product.aggregate([
        { $match: { store: storeObjectId, deletedAt: null } },
        {
          $lookup: {
            from: 'orders',
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$seller", sellerObjectId] },
                      { $ne: ["$status", "cancelled"] },
                      { $in: ["$$productId", "$items.product"] }
                    ]
                  }
                }
              },
              { $project: { _id: 1 } }
            ],
            as: 'soldOrders'
          }
        },
        { $match: { soldOrders: { $size: 0 } } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            title: 1,
            slug: 1,
            basePrice: 1,
            createdAt: 1,
            images: 1,
            status: 1
          }
        }
      ]);

      const countRes = await Product.aggregate([
        { $match: { store: storeObjectId, deletedAt: null } },
        {
          $lookup: {
            from: 'orders',
            let: { productId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$seller", sellerObjectId] },
                      { $ne: ["$status", "cancelled"] },
                      { $in: ["$$productId", "$items.product"] }
                    ]
                  }
                }
              },
              { $project: { _id: 1 } }
            ],
            as: 'soldOrders'
          }
        },
        { $match: { soldOrders: { $size: 0 } } },
        { $count: "count" }
      ]);
      total = countRes[0]?.count || 0;
    }

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  },

  getAnalyticsTrends: async (sellerUserId, startDate, endDate, timezone = 'UTC') => {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerUserId);

    const result = await Order.aggregate([
      {
        $match: {
          seller: sellerObjectId,
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timezone } },
          revenue: { $sum: "$pricing.subtotal" },
          ordersCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          revenue: 1,
          ordersCount: 1,
          _id: 0
        }
      }
    ]);

    return result;
  }
};
