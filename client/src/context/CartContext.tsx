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
  addItem,
  clearCart as clearCartApi,
  getCart,
  removeItem,
  updateQuantity as updateQuantityApi,
} from '../services/cartService';
import { listActiveCoupons, validateCouponLocally } from '../services/couponService';
import type { Cart, CartItem, CartSummary, Coupon } from '../types/commerce';
import { getApiErrorMessage } from '../services/apiError';

interface CartContextValue {
  cart: Cart | null;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  estimatedTotal: number;
  appliedCoupon: Coupon | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  summary: CartSummary;
  addToCart: (productId: string, variantId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (variantId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (variantId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  refreshCart: () => Promise<void>;
  isItemInCart: (variantId: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  const fetchCart = useCallback(async () => {
    if (!user || user.role !== 'customer') {
      setCart(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getCart();
      setCart(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load shopping cart.'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const items = useMemo(() => cart?.items || [], [cart]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (item.priceSnapshot || item.variant?.price || 0) * (item.quantity || 0),
        0,
      ),
    [items],
  );

  // Validate applied coupon whenever items or subtotal change
  const { discountAmount } = useMemo(() => {
    if (!appliedCoupon || items.length === 0) {
      return { discountAmount: 0 };
    }
    const validation = validateCouponLocally(appliedCoupon, items);
    return { discountAmount: validation.isValid ? validation.discountAmount : 0 };
  }, [appliedCoupon, items]);

  const estimatedTax = 0; // Tax calculated at final checkout
  const estimatedShipping = subtotal >= 50 || subtotal === 0 ? 0 : 5.99; // Free shipping over $50
  const estimatedTotal = Math.max(0, subtotal - discountAmount + estimatedShipping + estimatedTax);

  const summary = useMemo<CartSummary>(
    () => ({
      subtotal,
      itemCount,
      estimatedShipping,
      estimatedTax,
      discount: discountAmount,
      total: estimatedTotal,
      appliedCoupon,
    }),
    [subtotal, itemCount, estimatedShipping, estimatedTax, discountAmount, estimatedTotal, appliedCoupon],
  );

  const isItemInCart = useCallback(
    (variantId: string) =>
      items.some(
        (item) =>
          String(item.variant?._id || item.variant) === String(variantId),
      ),
    [items],
  );

  const addToCart = useCallback(
    async (productId: string, variantId: string, quantity = 1): Promise<boolean> => {
      if (!user || user.role !== 'customer') {
        setError('Please log in as a customer to add items to your cart.');
        return false;
      }

      setIsMutating(true);
      setError(null);
      try {
        const updatedCart = await addItem(productId, variantId, quantity);
        setCart(updatedCart);
        return true;
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to add item to cart.'));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [user],
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number): Promise<boolean> => {
      if (quantity <= 0) {
        return removeFromCart(variantId);
      }

      // Optimistic update
      const previousCart = cart;
      if (cart) {
        setCart({
          ...cart,
          items: cart.items.map((item) => {
            const vId = String(item.variant?._id || item.variant);
            return vId === String(variantId) ? { ...item, quantity } : item;
          }),
        });
      }

      setIsMutating(true);
      setError(null);
      try {
        const updatedCart = await updateQuantityApi(variantId, quantity);
        setCart(updatedCart);
        return true;
      } catch (err) {
        // Rollback on error
        setCart(previousCart);
        setError(getApiErrorMessage(err, 'Unable to update item quantity.'));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [cart],
  );

  const removeFromCart = useCallback(
    async (variantId: string): Promise<boolean> => {
      // Optimistic update
      const previousCart = cart;
      if (cart) {
        setCart({
          ...cart,
          items: cart.items.filter(
            (item) => String(item.variant?._id || item.variant) !== String(variantId),
          ),
        });
      }

      setIsMutating(true);
      setError(null);
      try {
        const updatedCart = await removeItem(variantId);
        setCart(updatedCart);
        return true;
      } catch (err) {
        setCart(previousCart);
        setError(getApiErrorMessage(err, 'Unable to remove item from cart.'));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [cart],
  );

  const clearCart = useCallback(async (): Promise<boolean> => {
    const previousCart = cart;
    setCart(cart ? { ...cart, items: [] } : null);
    setIsMutating(true);
    setError(null);
    try {
      const updated = await clearCartApi();
      setCart(updated);
      setAppliedCoupon(null);
      return true;
    } catch (err) {
      setCart(previousCart);
      setError(getApiErrorMessage(err, 'Unable to clear cart.'));
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [cart]);

  const applyCoupon = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      if (!code.trim()) {
        return { success: false, message: 'Please enter a coupon code.' };
      }
      try {
        const activeCoupons = await listActiveCoupons();
        const found = activeCoupons.find(
          (c) => c.code.toUpperCase() === code.trim().toUpperCase(),
        );

        if (!found) {
          return { success: false, message: 'Invalid or expired coupon code.' };
        }

        const validation = validateCouponLocally(found, items);
        if (!validation.isValid) {
          return {
            success: false,
            message: validation.reason || 'This coupon cannot be applied to your cart.',
          };
        }

        setAppliedCoupon(found);
        return {
          success: true,
          message: `Coupon "${found.code}" applied! You save $${validation.discountAmount.toFixed(2)}.`,
        };
      } catch (err) {
        return {
          success: false,
          message: getApiErrorMessage(err, 'Unable to validate coupon code.'),
        };
      }
    },
    [items],
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      items,
      itemCount,
      subtotal,
      discountAmount,
      estimatedTotal,
      appliedCoupon,
      isLoading,
      isMutating,
      error,
      summary,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      applyCoupon,
      removeCoupon,
      refreshCart: fetchCart,
      isItemInCart,
    }),
    [
      cart,
      items,
      itemCount,
      subtotal,
      discountAmount,
      estimatedTotal,
      appliedCoupon,
      isLoading,
      isMutating,
      error,
      summary,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      applyCoupon,
      removeCoupon,
      fetchCart,
      isItemInCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
