export function validatePayload(schema, payload) {
  if (!schema || typeof schema.validate !== 'function') {
    throw new Error('Validation schema is not configured correctly');
  }

  const { error, value } = schema.validate(payload, { abortEarly: false, stripUnknown: true });

  if (error) {
    const errors = error.details.map((detail) => ({ field: detail.path.join('.'), message: detail.message }));
    return { isValid: false, errors };
  }

  return { isValid: true, data: value };
}
