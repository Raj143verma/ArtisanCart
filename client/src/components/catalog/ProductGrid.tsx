import type { Product } from '../../types/catalog';
import { EmptyState } from '../common/EmptyState';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onResetFilters?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProductGrid({
  products,
  isLoading,
  error,
  onRetry,
  onResetFilters,
  emptyTitle = 'No products found',
  emptyDescription = 'Try adjusting your search terms, category, or price filters to discover more handcrafted items.',
}: ProductGridProps) {
  if (isLoading) {
    return <LoadingSkeleton type="card" count={6} />;
  }

  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={onRetry}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionText={onResetFilters ? 'Clear all filters' : undefined}
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="product-grid" role="region" aria-label="Product Catalog">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
