import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Store } from '../models/store.model.js';
import { Order } from '../models/order.model.js';
import { Product } from '../models/product.model.js';
import { Transaction } from '../models/transaction.model.js';
import { ProductVariant } from '../models/productVariant.model.js';
import { Category } from '../models/category.model.js';
import { Inventory } from '../models/inventory.model.js';

export const AdminDashboardRepository = {
  getMarketplaceOverview: async () => {
    const [userRes, storeRes, orderRes] = await Promise.all([
      User.aggregate([
        { $match: {} },
        {
          $facet: {
            metrics: [
              {
                $group: {
                  _id: null,
                  totalUsers: { $sum: 1 },
                  customers: { $sum: { $cond: [{ $eq: ["$role", "customer"] }, 1, 0] } },
                  sellers: { $sum: { $cond: [{ $eq: ["$role", "seller"] }, 1, 0] } }
                }
              },
              { $project: { _id: 0, totalUsers: 1, customers: 1, sellers: 1 } }
            ]
          }
        }
      ]),
      Store.aggregate([
        { $match: { deletedAt: null } },
        {
          $facet: {
            metrics: [
              {
                $group: {
                  _id: null,
                  activeStores: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                  pendingStores: { $sum: { $cond: [{ $eq: ["$status", "pending_approval"] }, 1, 0] } },
                  suspendedStores: { $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] } }
                }
              },
              { $project: { _id: 0, activeStores: 1, pendingStores: 1, suspendedStores: 1 } }
            ]
          }
        }
      ]),
      Order.aggregate([
        { $match: {} },
        {
          $facet: {
            metrics: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: {
                    $sum: {
                      $cond: [
                        { $in: ["$status", ["confirmed", "processing", "shipped", "delivered"]] },
                        "$pricing.subtotal",
                        0
                      ]
                    }
                  }
                }
              },
              { $project: { _id: 0, totalOrders: 1, totalRevenue: 1 } }
            ]
          }
        }
      ])
    ]);

    const u = userRes[0]?.metrics[0] || { totalUsers: 0, customers: 0, sellers: 0 };
    const s = storeRes[0]?.metrics[0] || { activeStores: 0, pendingStores: 0, suspendedStores: 0 };
    const o = orderRes[0]?.metrics[0] || { totalOrders: 0, totalRevenue: 0 };

    return {
      totalUsers: u.totalUsers || 0,
      customers: u.customers || 0,
      sellers: u.sellers || 0,
      activeStores: s.activeStores || 0,
      pendingStores: s.pendingStores || 0,
      suspendedStores: s.suspendedStores || 0,
      totalOrders: o.totalOrders || 0,
      totalRevenue: o.totalRevenue || 0
    };
  },

  getCatalogMetrics: async () => {
    const [
      products,
      active,
      draft,
      suspended,
      outOfStock,
      variants,
      categories,
      lowStockProductIds
    ] = await Promise.all([
      Product.countDocuments({ deletedAt: null }),
      Product.countDocuments({ isActive: true, deletedAt: null }),
      Product.countDocuments({ status: 'draft', deletedAt: null }),
      Product.countDocuments({ isActive: false, status: { $nin: ['draft', 'archived', 'rejected'] }, deletedAt: null }),
      Product.countDocuments({ stockQuantity: { $lte: 0 }, deletedAt: null }),
      ProductVariant.countDocuments({ deletedAt: null }),
      Category.countDocuments({ deletedAt: null }),
      Inventory.distinct('product', { status: 'low_stock' })
    ]);

    return {
      products,
      active,
      draft,
      suspended,
      outOfStock,
      variants,
      categories,
      lowStock: lowStockProductIds.length
    };
  },

  getOrdersMetrics: async () => {
    const result = await Order.aggregate([
      { $match: {} },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    const counts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };

    result.forEach(item => {
      if (item.status in counts) {
        counts[item.status] = item.count;
      }
    });

    return counts;
  },

  getRevenueMetrics: async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfSevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfThirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const salesResult = await Order.aggregate([
      { $match: { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } } },
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
          periodic: [
            {
              $group: {
                _id: null,
                today: { $sum: { $cond: [{ $gte: ["$createdAt", startOfToday] }, "$pricing.subtotal", 0] } },
                weekly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfSevenDaysAgo] }, "$pricing.subtotal", 0] } },
                monthly: { $sum: { $cond: [{ $gte: ["$createdAt", startOfThirtyDaysAgo] }, "$pricing.subtotal", 0] } }
              }
            },
            { $project: { _id: 0, today: 1, weekly: 1, monthly: 1 } }
          ]
        }
      }
    ]);

    const txResult = await Transaction.aggregate([
      { $match: {} },
      {
        $facet: {
          metrics: [
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                successfulPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "captured"] }, 1, 0] } },
                failedPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] } },
                cancelledPayments: { $sum: { $cond: [{ $eq: ["$paymentStatus", "cancelled"] }, 1, 0] } }
              }
            },
            { $project: { _id: 0, totalTransactions: 1, successfulPayments: 1, failedPayments: 1, cancelledPayments: 1 } }
          ]
        }
      }
    ]);

    const sales = salesResult[0]?.overall[0] || { totalRevenue: 0, totalUnitsSold: 0, averageOrderValue: 0 };
    const periodic = salesResult[0]?.periodic[0] || { today: 0, weekly: 0, monthly: 0 };
    const tx = txResult[0]?.metrics[0] || { totalTransactions: 0, successfulPayments: 0, failedPayments: 0, cancelledPayments: 0 };

    return {
      todayRevenue: periodic.today || 0,
      weeklyRevenue: periodic.weekly || 0,
      monthlyRevenue: periodic.monthly || 0,
      totalRevenue: sales.totalRevenue || 0,
      averageOrderValue: sales.averageOrderValue || 0,
      totalUnitsSold: sales.totalUnitsSold || 0,
      totalTransactions: tx.totalTransactions || 0,
      successfulPayments: tx.successfulPayments || 0,
      failedPayments: tx.failedPayments || 0,
      cancelledPayments: tx.cancelledPayments || 0
    };
  },

  getStoreDashboard: async (limit) => {
    const [
      recentlyCreated,
      pending,
      suspended,
      topSelling
    ] = await Promise.all([
      Store.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(limit).select('_id name slug status createdAt').lean(),
      Store.find({ status: 'pending_approval', deletedAt: null }).limit(50).select('_id name slug createdAt').lean(),
      Store.find({ status: 'suspended', deletedAt: null }).limit(50).select('_id name slug createdAt').lean(),
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } } },
        {
          $group: {
            _id: "$seller",
            totalSales: { $sum: "$pricing.subtotal" },
            ordersCount: { $sum: 1 }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'stores',
            localField: '_id',
            foreignField: 'owner',
            as: 'storeDoc'
          }
        },
        { $unwind: "$storeDoc" },
        {
          $project: {
            sellerUserId: "$_id",
            totalSales: 1,
            ordersCount: 1,
            storeName: "$storeDoc.name",
            storeSlug: "$storeDoc.slug",
            storeStatus: "$storeDoc.status",
            _id: 0
          }
        }
      ])
    ]);

    return {
      recentlyCreated,
      pending,
      suspended,
      topSelling
    };
  },

  getAnalyticsTrends: async (startDate, endDate, timezone = 'UTC') => {
    const dateQuery = {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    };

    const orderTrends = await Order.aggregate([
      {
        $match: {
          ...dateQuery,
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
      { $project: { date: "$_id", revenue: 1, ordersCount: 1, _id: 0 } }
    ]);

    const userTrends = await User.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timezone } },
          userCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", userCount: 1, _id: 0 } }
    ]);

    const sellerTrends = await Store.aggregate([
      {
        $match: {
          ...dateQuery,
          deletedAt: null
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timezone } },
          sellerCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", sellerCount: 1, _id: 0 } }
    ]);

    const transactionTrends = await Transaction.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timezone } },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", transactionCount: 1, _id: 0 } }
    ]);

    return {
      orderTrends,
      userTrends,
      sellerTrends,
      transactionTrends
    };
  }
};
