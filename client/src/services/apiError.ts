import axios from 'axios';

export interface ApiErrorPayload {
  message: string;
  status?: number;
  errors?: unknown;
  originalError: unknown;
}

export function normalizeApiError(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred.',
): ApiErrorPayload {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: unknown } | undefined;
    const message = data?.message || error.message || fallbackMessage;
    const status = error.response?.status;
    const errors = data?.errors;
    return {
      message,
      status,
      errors,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      originalError: error,
    };
  }

  return {
    message: typeof error === 'string' ? error : fallbackMessage,
    originalError: error,
  };
}

export function getApiErrorMessage(error: unknown, fallbackMessage?: string): string {
  return normalizeApiError(error, fallbackMessage).message;
}
