export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutItemProduct {
  _id: string;
  title: string;
  slug: string;
  images?: Array<{ url: string; isThumbnail?: boolean }>;
  basePrice: number;
  status: string;
}

export interface CheckoutItemVariant {
  _id: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  attributes: Array<{ name: string; value: string }>;
  isActive: boolean;
  stockQuantity?: number;
}

export interface CheckoutItem {
  product: CheckoutItemProduct | string;
  variant: CheckoutItemVariant | string;
  quantity: number;
  priceSnapshot: number;
}

export interface CheckoutPricing {
  subtotal: number;
  shippingFee: number;
  tax: number;
  discount: number;
  total: number;
}

export interface CheckoutSession {
  _id: string;
  user: string;
  cart: string;
  items: CheckoutItem[];
  shippingAddress: Address;
  billingAddress?: Address | null;
  pricing: CheckoutPricing;
  appliedCoupon?: string | null;
  couponCode?: string | null;
  couponDetailsSnapshot?: Record<string, unknown> | null;
  paymentStatus: 'pending' | 'processing' | 'paid' | 'failed';
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  paymentIntentId?: string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  product: string | { _id: string; title: string; slug: string; images?: Array<{ url: string }> };
  variant: string | { _id: string; sku: string; attributes: Array<{ name: string; value: string }> };
  quantity: number;
  price: number;
  discountAllocated: number;
  netTotal: number;
  productTitle: string;
  variantSku: string;
  variantAttributes?: Record<string, unknown> | Array<{ name: string; value: string }>;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: string | { _id: string; firstName: string; lastName: string; email: string };
  seller: string | { _id: string; name: string };
  checkoutSession?: string;
  items: OrderItem[];
  shippingAddress: Address;
  pricing: CheckoutPricing;
  coupon?: {
    code: string;
    discountType: string;
    discountValue: number;
    allocatedDiscount: number;
  } | null;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  _id: string;
  transactionNumber: string;
  user: string;
  orders?: string[] | Order[];
  amount: number;
  currency: string;
  provider: string;
  providerSessionId?: string;
  paymentStatus: 'created' | 'pending' | 'captured' | 'failed' | 'cancelled' | 'refunded';
  idempotencyKey: string;
  createdAt: string;
}
