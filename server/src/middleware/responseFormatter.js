export function responseFormatter(req, res, next) {
  // Ensure JSON responses are consistently sent.
  // We don't alter existing response shapes to avoid breaking controllers.
  // This middleware is intentionally lightweight and non-invasive.
  res.formatJson = (payload) => {
    // If payload is already a structured response, send as-is
    res.json(payload);
  };

  return next();
}
