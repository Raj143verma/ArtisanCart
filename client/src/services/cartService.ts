import api from './api';
import type { ApiResponse } from '../types/auth';
import type { Cart } from '../types/commerce';

export async function getCart(): Promise<Cart> {
  const response = await api.get<ApiResponse<Cart>>('/cart');
  return response.data.data;
}

export async function addItem(
  productId: string,
  variantId: string,
  quantity = 1,
): Promise<Cart> {
  const response = await api.post<ApiResponse<Cart>>('/cart/items', {
    productId,
    variantId,
    quantity,
  });
  return response.data.data;
}

export async function updateQuantity(
  variantId: string,
  quantity: number,
): Promise<Cart> {
  const response = await api.put<ApiResponse<Cart>>(`/cart/items/${variantId}`, {
    quantity,
  });
  return response.data.data;
}

export async function removeItem(variantId: string): Promise<Cart> {
  const response = await api.delete<ApiResponse<Cart>>(`/cart/items/${variantId}`);
  return response.data.data;
}

export async function clearCart(): Promise<Cart> {
  const response = await api.post<ApiResponse<Cart>>('/cart/clear');
  return response.data.data;
}
