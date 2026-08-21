import api, { refreshAccessToken } from './api';
import type { ApiResponse, LoginData, LoginPayload, RegisterPayload, User } from '../types/auth';

export async function login(payload: LoginPayload) {
  const response = await api.post<ApiResponse<LoginData>>('/auth/login', payload);
  return response.data.data;
}

export async function register(payload: RegisterPayload) {
  const response = await api.post<ApiResponse<{ user: User }>>('/auth/register', payload);
  return response.data.data;
}

export async function getCurrentUser() {
  const response = await api.get<ApiResponse<User>>('/auth/me');
  return response.data.data;
}

export async function refreshToken(): Promise<{ accessToken: string }> {
  const token = await refreshAccessToken();
  if (!token) {
    throw new Error('Failed to refresh access token');
  }
  return { accessToken: token };
}

export async function logout() {
  await api.post('/auth/logout');
}
