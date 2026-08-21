import type { ChangeEvent } from 'react';
import type { ListProductsQuery } from '../../types/catalog';

interface SortDropdownProps {
  value?: ListProductsQuery['sort'];
  onChange: (sort: ListProductsQuery['sort']) => void;
}

export function SortDropdown({ value = 'newest', onChange }: SortDropdownProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as ListProductsQuery['sort']);
  };

  return (
    <div className="sort-dropdown-wrap">
      <label htmlFor="catalog-sort-select">Sort by:</label>
      <select id="catalog-sort-select" value={value} onChange={handleChange}>
        <option value="newest">Newest Arrivals</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="featured">Featured First</option>
        <option value="oldest">Oldest Items</option>
      </select>
    </div>
  );
}
