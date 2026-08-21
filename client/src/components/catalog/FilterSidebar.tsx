import { useState, type FormEvent } from 'react';
import type { Category } from '../../types/catalog';
import { CategoryNav } from './CategoryNav';

interface FilterSidebarProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
  minPrice?: number;
  maxPrice?: number;
  onApplyPriceRange: (min?: number, max?: number) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterSidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  minPrice,
  maxPrice,
  onApplyPriceRange,
  onResetFilters,
  hasActiveFilters,
}: FilterSidebarProps) {
  const [localMin, setLocalMin] = useState<string>(minPrice ? String(minPrice) : '');
  const [localMax, setLocalMax] = useState<string>(maxPrice ? String(maxPrice) : '');

  const handlePriceSubmit = (e: FormEvent) => {
    e.preventDefault();
    const min = localMin ? Number(localMin) : undefined;
    const max = localMax ? Number(localMax) : undefined;
    onApplyPriceRange(min, max);
  };

  const handleReset = () => {
    setLocalMin('');
    setLocalMax('');
    onResetFilters();
  };

  return (
    <aside className="filter-sidebar" aria-label="Catalog filters">
      <div className="filter-group">
        <h4>Categories</h4>
        <CategoryNav
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={onSelectCategory}
          variant="tree"
        />
      </div>

      <div className="filter-group">
        <h4>Price Range ($)</h4>
        <form onSubmit={handlePriceSubmit} className="price-range-form">
          <div className="price-range-inputs">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={localMin}
              onChange={(e) => setLocalMin(e.target.value)}
              aria-label="Minimum price"
            />
            <span>to</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={localMax}
              onChange={(e) => setLocalMax(e.target.value)}
              aria-label="Maximum price"
            />
          </div>
          <button
            type="submit"
            className="button button--small button--secondary"
            style={{ marginTop: '0.6rem', width: '100%' }}
          >
            Apply Price
          </button>
        </form>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          className="button button--small"
          onClick={handleReset}
          style={{ width: '100%' }}
        >
          Clear All Filters
        </button>
      )}
    </aside>
  );
}
