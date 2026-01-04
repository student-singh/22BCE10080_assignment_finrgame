/**
 * Error handling middleware for the Connect4 API
 * Provides consistent error responses and logging
 */

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  // Default status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Log error details
  console.error(`⚠️ Error [${statusCode}]: ${message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  
  // Client errors
  if (statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({
      error: true,
      message,
      status: statusCode,
      path: req.path
    });
  }
  
  // Server errors - avoid leaking implementation details in production
  return res.status(statusCode).json({
    error: true,
    message: 'Internal Server Error',
    status: 500,
    path: req.path,
    // Include request ID for tracking if available
    requestId: req.id || null
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: true,
    message: `Route not found: ${req.method} ${req.path}`,
    status: 404
  });
};

// Request logger middleware (for debugging)
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log when the request completes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} ${res.statusCode} ${duration}ms - ${req.ip}`
    );
  });
  
  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger
};
