export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Rota nao encontrada: ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
}
