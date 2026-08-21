import { useEffect, useState } from 'react';
import { getCategoryTree } from '../services/catalogService';
import type { Category } from '../types/catalog';
import { getApiErrorMessage } from '../services/apiError';

let cachedCategoryTree: Category[] | null = null;

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(cachedCategoryTree || []);
  const [isLoading, setIsLoading] = useState(!cachedCategoryTree);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCategoryTree) {
      setCategories(cachedCategoryTree);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getCategoryTree()
      .then((data) => {
        cachedCategoryTree = data;
        if (isMounted) {
          setCategories(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getApiErrorMessage(err, 'Failed to load categories.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, isLoading, error };
}
