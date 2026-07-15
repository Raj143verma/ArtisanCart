import { Inventory } from '../models/inventory.model.js';

export const InventoryRepository = {
  findByVariantId: (variantId) => Inventory.findOne({ variant: variantId }),
  
  create: (payload) => Inventory.create(payload),
  
  updateByVariantId: (variantId, update) => 
    Inventory.findOneAndUpdate(
      { variant: variantId }, 
      update, 
      { new: true, runValidators: true }
    ),
    
  upsertByVariantId: (variantId, payload) =>
    Inventory.findOneAndUpdate(
      { variant: variantId },
      payload,
      { new: true, upsert: true, runValidators: true }
    ),

  adjustStockAtomic: (variantId, amount) => {
    const filter = { variant: variantId };
    if (amount < 0) {
      filter.available = { $gte: Math.abs(amount) };
    }

    return Inventory.findOneAndUpdate(
      filter,
      [
        {
          $set: {
            available: { $add: ['$available', amount] }
          }
        },
        {
          $set: {
            status: {
              $cond: {
                if: { $lte: ['$available', 0] },
                then: 'out_of_stock',
                else: {
                  $cond: {
                    if: { $lte: ['$available', '$lowStockThreshold'] },
                    then: 'low_stock',
                    else: 'in_stock'
                  }
                }
              }
            }
          }
        }
      ],
      { new: true }
    );
  },
};
