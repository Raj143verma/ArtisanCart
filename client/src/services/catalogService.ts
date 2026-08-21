import api from './api';
import type { ApiResponse } from '../types/auth';
import type {
  Category,
  ListProductsQuery,
  PaginatedResponse,
  PaginationMeta,
  Product,
  ProductReview,
  ProductVariant,
} from '../types/catalog';

export async function listProducts(
  params: ListProductsQuery = {},
): Promise<PaginatedResponse<Product>> {
  const response = await api.get<ApiResponse<Product[]>>('/products', {
    params,
  });

  const docs = response.data.data || [];
  const meta = (response.data.meta as PaginationMeta) || {
    total: docs.length,
    page: params.page || 1,
    limit: params.limit || 20,
    pages: Math.ceil(docs.length / (params.limit || 20)) || 1,
  };

  return { docs, meta };
}

export async function getProductById(id: string): Promise<Product> {
  const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
  return response.data.data;
}

export async function listCategories(): Promise<Category[]> {
  const response = await api.get<ApiResponse<Category[]>>('/categories');
  return response.data.data || [];
}

export async function getCategoryTree(): Promise<Category[]> {
  const response = await api.get<ApiResponse<Category[]>>('/categories/tree');
  return response.data.data || [];
}

export async function listVariants(productId: string): Promise<ProductVariant[]> {
  const response = await api.get<ApiResponse<ProductVariant[]>>(`/products/${productId}/variants`);
  return response.data.data || [];
}

export async function listProductReviews(
  productId: string,
  page = 1,
  limit = 10,
): Promise<PaginatedResponse<ProductReview>> {
  const response = await api.get<ApiResponse<ProductReview[]>>(`/products/${productId}/reviews`, {
    params: { page, limit },
  });

  const docs = response.data.data || [];
  const meta = (response.data.meta as PaginationMeta) || {
    total: docs.length,
    page,
    limit,
    pages: 1,
  };

  return { docs, meta };
}
