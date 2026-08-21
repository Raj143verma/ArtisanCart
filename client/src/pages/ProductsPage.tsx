import { useMemo } from 'react';
import { CategoryNav } from '../components/catalog/CategoryNav';
import { FilterSidebar } from '../components/catalog/FilterSidebar';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { SearchBar } from '../components/catalog/SearchBar';
import { SortDropdown } from '../components/catalog/SortDropdown';
import { Pagination } from '../components/common/Pagination';
import { useCatalog } from '../hooks/useCatalog';
import { useCategories } from '../hooks/useCategories';

export function ProductsPage() {
  const { categories } = useCategories();
  const {
    products,
    meta,
    isLoading,
    error,
    currentQuery,
    refetch,
    setSearch,
    setCategory,
    setSort,
    setPage,
    setPriceRange,
    resetFilters,
  } = useCatalog({ limit: 12 });

  const activeCategory = useMemo(() => {
    if (!currentQuery.category || !categories.length) return null;
    const findCat = (cats: typeof categories): typeof categories[0] | null => {
      for (const c of cats) {
        if (c._id === currentQuery.category) return c;
        if (c.children?.length) {
          const found = findCat(c.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findCat(categories);
  }, [categories, currentQuery.category]);

  const hasActiveFilters = Boolean(
    currentQuery.q ||
      currentQuery.category ||
      currentQuery.minPrice ||
      currentQuery.maxPrice ||
      currentQuery.featured,
  );

  return (
    <div className="catalog-page-container">
      <div className="catalog-header">
        <div className="catalog-title-row">
          <div>
            <span className="eyebrow">Artisan Marketplace</span>
            <h1>{activeCategory ? activeCategory.name : 'Handcrafted Catalog'}</h1>
          </div>
          {meta.total > 0 && (
            <span className="pagination-summary">{meta.total} products available</span>
          )}
        </div>

        {categories.length > 0 && (
          <CategoryNav
            categories={categories}
            selectedCategoryId={currentQuery.category}
            onSelectCategory={setCategory}
            variant="pills"
          />
        )}

        <div className="catalog-toolbar">
          <SearchBar
            initialValue={currentQuery.q || ''}
            onSearch={setSearch}
            placeholder="Search products by title, artisan, craft..."
          />
          <SortDropdown value={currentQuery.sort} onChange={setSort} />
        </div>
      </div>

      <div className="catalog-page-layout">
        <FilterSidebar
          categories={categories}
          selectedCategoryId={currentQuery.category}
          onSelectCategory={setCategory}
          minPrice={currentQuery.minPrice}
          maxPrice={currentQuery.maxPrice}
          onApplyPriceRange={setPriceRange}
          onResetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <main className="catalog-main-content">
          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
            onResetFilters={resetFilters}
            emptyTitle="No artisan items found"
            emptyDescription="We couldn't find any products matching your current filters. Try searching for something else or clearing your filters."
          />

          {!isLoading && !error && meta.pages > 1 && (
            <Pagination
              currentPage={meta.page}
              totalPages={meta.pages}
              onPageChange={setPage}
              totalItems={meta.total}
              itemsPerPage={meta.limit}
            />
          )}
        </main>
      </div>
    </div>
  );
}
