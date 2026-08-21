interface StockBadgeProps {
  quantity?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
}

export function StockBadge({
  quantity,
  lowStockThreshold = 5,
  allowBackorder = false,
}: StockBadgeProps) {
  if (quantity === undefined) return null;

  if (quantity <= 0) {
    if (allowBackorder) {
      return <span className="stock-badge stock-badge--backorder">Backorder available</span>;
    }
    return <span className="stock-badge stock-badge--out">Out of Stock</span>;
  }

  if (quantity <= lowStockThreshold) {
    return (
      <span className="stock-badge stock-badge--low">
        Only {quantity} left in stock
      </span>
    );
  }

  return <span className="stock-badge stock-badge--in">In Stock</span>;
}
