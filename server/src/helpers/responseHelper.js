export function createSuccessResponse(data = null, message = 'Success', meta = null) {
  return {
    status: 'success',
    message,
    data,
    meta,
  };
}

export function createErrorResponse(message = 'An error occurred', errors = null) {
  return {
    status: 'error',
    message,
    errors,
  };
}
