export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent?: string | null;
  description?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  icon?: { public_id?: string; url?: string };
  thumbnail?: { public_id?: string; url?: string };
  banner?: { public_id?: string; url?: string };
  children?: Category[];
}

export interface ProductImage {
  _id: string;
  url: string;
  public_id?: string;
  isThumbnail?: boolean;
  displayOrder?: number;
}

export interface ProductStore {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  category?: Category | { _id: string; name: string; slug?: string } | string;
  categories?: Array<Category | string>;
  basePrice: number;
  currency: string;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived' | 'out_of_stock';
  tags?: string[];
  images?: ProductImage[];
  store?: ProductStore | string;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantAttribute {
  name: string;
  value: string;
}

export interface VariantInventory {
  quantity: number;
  reserved?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
}

export interface ProductVariant {
  _id: string;
  product: string;
  sku: string;
  title: string;
  price: number;
  attributes: VariantAttribute[];
  inventory?: VariantInventory;
  isActive: boolean;
}

export interface ProductReview {
  _id: string;
  product: string;
  user: {
    _id?: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase?: boolean;
  sellerReply?: {
    comment: string;
    repliedAt: string;
  };
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  averageRating?: number;
}

export interface ListProductsQuery {
  q?: string;
  slug?: string;
  category?: string;
  store?: string;
  featured?: boolean;
  active?: boolean;
  minPrice?: number;
  maxPrice?: number;
  tags?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'featured';
}

export interface PaginatedResponse<T> {
  docs: T[];
  meta: PaginationMeta;
}
