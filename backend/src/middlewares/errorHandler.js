export function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Rota nao encontrada: ${req.originalUrl}`));
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = err.code === "LIMIT_FILE_SIZE"
    ? "O arquivo do certificado ultrapassa o limite permitido."
    : err.message;

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
}
