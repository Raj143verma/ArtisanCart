import api from './api';
import type { ApiResponse } from '../types/auth';
import type { Transaction } from '../types/checkout';

export async function initializePayment(
  orderIds: string[],
  idempotencyKey: string,
  provider = 'mock',
): Promise<Transaction> {
  const response = await api.post<ApiResponse<Transaction>>('/payments/initialize', {
    orderIds,
    idempotencyKey,
    provider,
  });
  return response.data.data;
}

export async function verifyPayment(
  providerSessionId: string,
  status: 'captured' | 'failed' = 'captured',
): Promise<Transaction> {
  const response = await api.post<ApiResponse<Transaction>>('/payments/verify', {
    providerSessionId,
    status,
  });
  return response.data.data;
}

export async function getTransaction(transactionId: string): Promise<Transaction> {
  const response = await api.get<ApiResponse<Transaction>>(`/payments/${transactionId}`);
  return response.data.data;
}
