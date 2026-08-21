import api from './api';
import type { ApiResponse } from '../types/auth';
import type { Address, CheckoutSession } from '../types/checkout';

export async function initCheckout(
  shippingAddress: Address,
  billingAddress?: Address | null,
): Promise<CheckoutSession> {
  const response = await api.post<ApiResponse<CheckoutSession>>('/checkout', {
    shippingAddress,
    billingAddress: billingAddress || null,
  });
  return response.data.data;
}

export async function getCheckout(sessionId: string): Promise<CheckoutSession> {
  const response = await api.get<ApiResponse<CheckoutSession>>(`/checkout/${sessionId}`);
  return response.data.data;
}

export async function cancelCheckout(sessionId: string): Promise<CheckoutSession> {
  const response = await api.post<ApiResponse<CheckoutSession>>(`/checkout/${sessionId}/cancel`);
  return response.data.data;
}

export async function applyCouponToCheckout(
  sessionId: string,
  couponCode: string,
): Promise<CheckoutSession> {
  const response = await api.post<ApiResponse<CheckoutSession>>(
    `/checkout/${sessionId}/apply-coupon`,
    { couponCode: couponCode.trim().toUpperCase() },
  );
  return response.data.data;
}

export async function removeCouponFromCheckout(sessionId: string): Promise<CheckoutSession> {
  const response = await api.post<ApiResponse<CheckoutSession>>(
    `/checkout/${sessionId}/remove-coupon`,
  );
  return response.data.data;
}
