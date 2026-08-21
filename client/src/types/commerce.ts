export interface CartItemProduct {
  _id: string;
  title: string;
  slug: string;
  images?: Array<{
    _id?: string;
    url: string;
    isThumbnail?: boolean;
    displayOrder?: number;
  }>;
  status: string;
  basePrice: number;
  deletedAt?: string | null;
}

export interface CartItemVariant {
  _id: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  attributes: Array<{ name: string; value: string }>;
  isActive: boolean;
  stockQuantity?: number;
  deletedAt?: string | null;
}

export interface CartItem {
  product: CartItemProduct;
  variant: CartItemVariant;
  quantity: number;
  priceSnapshot: number;
}

export interface Cart {
  _id?: string;
  user: string;
  items: CartItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WishlistItem {
  product: CartItemProduct;
  variant: CartItemVariant;
  store?: {
    _id: string;
    name: string;
    slug: string;
  };
  inventory?: {
    available: number;
    status: string;
  };
  addedAt: string;
  isWishlisted: boolean;
}

export interface WishlistResponse {
  docs: WishlistItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maximumDiscount?: number;
  minimumOrderValue: number;
  scope: 'marketplace' | 'store' | 'product' | 'category';
  store?: string | null;
  products?: string[];
  categories?: string[];
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageLimit?: number;
  perUserLimit?: number;
  usageCount?: number;
}

export interface CartSummary {
  subtotal: number;
  itemCount: number;
  estimatedShipping: number;
  estimatedTax: number;
  discount: number;
  total: number;
  appliedCoupon?: Coupon | null;
}
