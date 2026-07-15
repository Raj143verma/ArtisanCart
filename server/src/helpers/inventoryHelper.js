/**
 * Calculates the inventory status based on available stock, low stock threshold, and optional reserved stock.
 * This helper is designed to support future reserved stock without changing the core schema or API contracts.
 * 
 * @param {number} available - The available stock count.
 * @param {number} lowStockThreshold - The threshold below which stock is considered low.
 * @param {number} [reserved=0] - The reserved stock count (defaults to 0).
 * @returns {string} - The computed status: 'in_stock', 'low_stock', or 'out_of_stock'.
 */
export function calculateInventoryStatus(available, lowStockThreshold, reserved = 0) {
  const netAvailable = available - reserved;
  if (netAvailable <= 0) {
    return 'out_of_stock';
  } else if (netAvailable <= lowStockThreshold) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
}
