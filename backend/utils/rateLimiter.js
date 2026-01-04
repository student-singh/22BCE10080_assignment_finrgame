/**
 * Rate limiting configurations for the Connect4 API
 * This file exports rate limiters for different parts of the application
 */

const rateLimit = require('express-rate-limit');

// Common message generator for rate limit responses
const createLimitMessage = (windowMins, retryAfter) => ({
  status: 429,
  message: `Too many requests, please try again later.`,
  retryAfter: retryAfter || Math.ceil(windowMins * 60 / 60), // Return retry time in seconds
  error: true,
  timestamp: new Date().toISOString(), // Add timestamp for client tracking
  code: 'RATE_LIMITED'
});

// Optional success handler to include rate limit information in successful responses
const successHandler = (req, res, next, options) => {
  // Add rate limit headers to successful responses if enabled
  if (!options.skipSuccessHandler) {
    res.setHeader('X-RateLimit-Remaining-Custom', options.remainingPoints);
    res.setHeader('X-RateLimit-Limit-Custom', options.points);
    res.setHeader('X-RateLimit-Reset-Custom', new Date(Date.now() + options.msBeforeNext).toISOString());
  }
  next();
};

// Standard API limiter for most routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 100, // 100 requests per window per IP
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: createLimitMessage(15),
  skipSuccessHandler: false, // Enable success handler for this limiter
  skipFailedRequests: false, // Count failed requests against the limit
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (for clients behind proxies)
    return req.headers['x-forwarded-for'] || req.ip;
  },
  // Add custom success handler to include rate limit info in responses
  onLimitReached: (req, res, options) => {
    console.log(`⚠️ Rate limit reached for ${req.ip} on ${req.path}`);
  },
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  },
  // Custom success handler
  handler: (req, res, next, options) => {
    console.log(`⚠️ Rate limit exceeded for ${req.ip} on ${req.path}`);
    
    const responseBody = {
      ...options.message,
      path: req.path,
      method: req.method,
    };
    
    // Return the rate limit response
    return res.status(options.statusCode).json(responseBody);
  },
});

// More permissive limiter for health checks and wake-up calls
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: createLimitMessage(1),
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip;
  },
  skip: (req) => req.method === 'OPTIONS',
  handler: (req, res, next, options) => {
    console.log(`⚠️ Health check rate limit exceeded for ${req.ip}`);
    res.status(options.statusCode).json({
      ...options.message,
      endpoint: 'health',
      serverTime: new Date().toISOString()
    });
  }
});

// Strict limiter for sensitive operations (like user registration)
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // 5 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: createLimitMessage(60, 60), // 60 minutes retry
  handler: (req, res, next, options) => {
    console.log(`⚠️ Strict rate limit exceeded for ${req.ip} on ${req.path}`);
    res.status(options.statusCode).json(options.message);
  }
});

module.exports = {
  apiLimiter,
  healthLimiter,
  strictLimiter
};
