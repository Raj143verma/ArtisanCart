import api from './api';
import type { ApiResponse } from '../types/auth';
import type { WishlistResponse } from '../types/commerce';

export interface WishlistMutationResult {
  items: Array<{
    product: string;
    variant: string;
    addedAt?: string;
  }>;
}

export async function getWishlist(
  page = 1,
  limit = 20,
): Promise<WishlistResponse> {
  const response = await api.get<ApiResponse<WishlistResponse>>('/wishlist', {
    params: { page, limit },
  });
  return response.data.data;
}

export async function addWishlistItem(
  productId: string,
  variantId: string,
): Promise<WishlistMutationResult> {
  const response = await api.post<ApiResponse<WishlistMutationResult>>('/wishlist', {
    productId,
    variantId,
  });
  return response.data.data;
}

export async function removeWishlistItem(
  productId: string,
  variantId: string,
): Promise<WishlistMutationResult> {
  const response = await api.delete<ApiResponse<WishlistMutationResult>>('/wishlist', {
    data: { productId, variantId },
  });
  return response.data.data;
}

export async function checkWishlistItem(
  productId: string,
  variantId: string,
): Promise<{ isWishlisted: boolean }> {
  const response = await api.get<ApiResponse<{ isWishlisted: boolean }>>(
    '/wishlist/check',
    {
      params: { productId, variantId },
    },
  );
  return response.data.data;
}

export async function clearWishlist(): Promise<WishlistMutationResult> {
  const response = await api.delete<ApiResponse<WishlistMutationResult>>('/wishlist/clear');
  return response.data.data;
}
