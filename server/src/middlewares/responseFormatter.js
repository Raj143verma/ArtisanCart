export function responseFormatter(req, res, next) {
  const oldJson = res.json;

  res.json = function (payload) {
    if (res.headersSent) {
      return res;
    }

    if (payload && payload.status && payload.data !== undefined) {
      return oldJson.call(this, payload);
    }

    return oldJson.call(this, {
      status: 'success',
      message: 'Request completed',
      data: payload,
    });
  };

  next();
}
