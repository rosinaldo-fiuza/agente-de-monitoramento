import { logger } from "../utils/logger.js"

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500

  logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`)
  logger.error(err.stack)

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message: process.env.NODE_ENV === "production" ? "Erro interno do servidor" : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  })
}
