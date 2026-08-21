import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  addWishlistItem,
  clearWishlist as clearWishlistApi,
  getWishlist,
  removeWishlistItem,
} from '../services/wishlistService';
import type { WishlistItem } from '../types/commerce';
import { getApiErrorMessage } from '../services/apiError';

interface WishlistContextValue {
  wishlistItems: WishlistItem[];
  totalCount: number;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  addToWishlist: (productId: string, variantId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string, variantId: string) => Promise<boolean>;
  toggleWishlist: (productId: string, variantId: string) => Promise<boolean>;
  isWishlisted: (variantId: string) => boolean;
  clearWishlist: () => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [wishlistVariantIds, setWishlistVariantIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!user || user.role !== 'customer') {
      setWishlistItems([]);
      setTotalCount(0);
      setWishlistVariantIds(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getWishlist(1, 50);
      setWishlistItems(response.docs || []);
      setTotalCount(response.total || 0);
      const vIds = new Set(
        response.docs.map((doc) => String(doc.variant?._id || doc.variant)),
      );
      setWishlistVariantIds(vIds);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load saved items.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const isWishlisted = useCallback(
    (variantId: string) => wishlistVariantIds.has(String(variantId)),
    [wishlistVariantIds],
  );

  const addToWishlist = useCallback(
    async (productId: string, variantId: string): Promise<boolean> => {
      if (!user || user.role !== 'customer') {
        setError('Please log in as a customer to save items to your wishlist.');
        return false;
      }

      // Optimistic addition
      setWishlistVariantIds((prev) => new Set(prev).add(String(variantId)));
      setIsMutating(true);
      setError(null);

      try {
        await addWishlistItem(productId, variantId);
        await fetchWishlist();
        return true;
      } catch (err) {
        // Rollback
        setWishlistVariantIds((prev) => {
          const next = new Set(prev);
          next.delete(String(variantId));
          return next;
        });
        setError(getApiErrorMessage(err, 'Unable to save item to wishlist.'));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [user, fetchWishlist],
  );

  const removeFromWishlist = useCallback(
    async (productId: string, variantId: string): Promise<boolean> => {
      // Optimistic removal
      setWishlistVariantIds((prev) => {
        const next = new Set(prev);
        next.delete(String(variantId));
        return next;
      });
      setWishlistItems((prev) =>
        prev.filter((item) => String(item.variant?._id || item.variant) !== String(variantId)),
      );

      setIsMutating(true);
      setError(null);

      try {
        await removeWishlistItem(productId, variantId);
        await fetchWishlist();
        return true;
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to remove item from wishlist.'));
        await fetchWishlist();
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchWishlist],
  );

  const toggleWishlist = useCallback(
    async (productId: string, variantId: string): Promise<boolean> => {
      if (isWishlisted(variantId)) {
        return removeFromWishlist(productId, variantId);
      }
      return addToWishlist(productId, variantId);
    },
    [isWishlisted, removeFromWishlist, addToWishlist],
  );

  const clearWishlist = useCallback(async (): Promise<boolean> => {
    setIsMutating(true);
    setError(null);
    try {
      await clearWishlistApi();
      setWishlistItems([]);
      setTotalCount(0);
      setWishlistVariantIds(new Set());
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to clear wishlist.'));
      return false;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistItems,
      totalCount,
      isLoading,
      isMutating,
      error,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
      refreshWishlist: fetchWishlist,
    }),
    [
      wishlistItems,
      totalCount,
      isLoading,
      isMutating,
      error,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      isWishlisted,
      clearWishlist,
      fetchWishlist,
    ],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
