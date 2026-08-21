import api from './api';
import type { ApiResponse } from '../types/auth';
import type { Order } from '../types/checkout';

export async function createOrder(checkoutSessionId: string): Promise<Order[]> {
  const response = await api.post<ApiResponse<Order[]>>('/orders', {
    checkoutSessionId,
  });
  return response.data.data;
}

export async function getOrderById(orderId: string): Promise<Order> {
  const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`);
  return response.data.data;
}

export async function listOrders(): Promise<Order[]> {
  const response = await api.get<ApiResponse<Order[]>>('/orders');
  return response.data.data || [];
}
