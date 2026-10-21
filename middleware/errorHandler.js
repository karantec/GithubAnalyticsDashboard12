const AppError = require("../utils/AppError");

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongo duplicate key
  if (err.code === 11000) {
    error = new AppError("Repository is already saved", 409);
  }
  // Mongoose validation
  else if (err.name === "ValidationError") {
    error = new AppError(
      Object.values(err.errors).map((e) => e.message).join(", "),
      400
    );
  }
  // Bad JSON body
  else if (err.type === "entity.parse.failed") {
    error = new AppError("Invalid JSON body", 400);
  }

  const statusCode = error.statusCode || 500;

  if (statusCode === 429 && error.extra?.retryAfter) {
    res.set("Retry-After", String(error.extra.retryAfter));
  }

  if (statusCode >= 500) console.error("❌", err);

  res.status(statusCode).json({
    success: false,
    message: error.isOperational ? error.message : "Internal server error",
    ...(error.extra && Object.keys(error.extra).length ? error.extra : {}),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
