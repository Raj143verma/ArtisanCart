import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listProducts } from '../services/catalogService';
import type { ListProductsQuery, PaginationMeta, Product } from '../types/catalog';
import { getApiErrorMessage } from '../services/apiError';

export function useCatalog(initialQuery: ListProductsQuery = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract query filters from URL search params with fallback to initialQuery
  const currentQuery = useMemo<ListProductsQuery>(() => {
    const q = searchParams.get('q') || initialQuery.q || undefined;
    const category = searchParams.get('category') || initialQuery.category || undefined;
    const sort =
      (searchParams.get('sort') as ListProductsQuery['sort']) || initialQuery.sort || 'newest';
    const page = Number(searchParams.get('page')) || initialQuery.page || 1;
    const minPrice = searchParams.get('minPrice')
      ? Number(searchParams.get('minPrice'))
      : initialQuery.minPrice;
    const maxPrice = searchParams.get('maxPrice')
      ? Number(searchParams.get('maxPrice'))
      : initialQuery.maxPrice;
    const featured = searchParams.get('featured') === 'true' ? true : initialQuery.featured;

    return {
      q,
      category,
      sort,
      page,
      minPrice,
      maxPrice,
      featured,
      limit: initialQuery.limit || 20,
    };
  }, [searchParams, initialQuery]);

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listProducts(currentQuery);
      setProducts(result.docs);
      setMeta(result.meta);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load products.'));
    } finally {
      setIsLoading(false);
    }
  }, [currentQuery]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Query modifier helpers
  const updateQueryParam = useCallback(
    (updates: Partial<Record<string, string | number | undefined | null>>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, val]) => {
          if (val === undefined || val === null || val === '') {
            next.delete(key);
          } else {
            next.set(key, String(val));
          }
        });
        // Reset page to 1 when changing filters (except when specifically setting page)
        if (!('page' in updates)) {
          next.delete('page');
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (q: string) => {
      updateQueryParam({ q: q.trim() || undefined });
    },
    [updateQueryParam],
  );

  const setCategory = useCallback(
    (category?: string) => {
      updateQueryParam({ category });
    },
    [updateQueryParam],
  );

  const setSort = useCallback(
    (sort: ListProductsQuery['sort']) => {
      updateQueryParam({ sort });
    },
    [updateQueryParam],
  );

  const setPage = useCallback(
    (page: number) => {
      updateQueryParam({ page });
    },
    [updateQueryParam],
  );

  const setPriceRange = useCallback(
    (minPrice?: number, maxPrice?: number) => {
      updateQueryParam({ minPrice, maxPrice });
    },
    [updateQueryParam],
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
    products,
    meta,
    isLoading,
    error,
    currentQuery,
    refetch: fetchCatalog,
    setSearch,
    setCategory,
    setSort,
    setPage,
    setPriceRange,
    resetFilters,
  };
}
