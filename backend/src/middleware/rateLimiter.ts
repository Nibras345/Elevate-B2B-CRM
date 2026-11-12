import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Strict Rate Limiter for Authentication / Login Routes
 * Prevents brute force credential attacks by restricting failed attempts per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5, // Generous in development, strict in production
  skipSuccessfulRequests: true, // Only count failed logins towards rate limiting
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
});

/**
 * General Rate Limiter for Standard API Routes
 * Protects platform infrastructure against general spam and DDoS.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 100, // Generous in development, 100 requests per 15 mins in production
  skip: (req) => req.method === 'OPTIONS', // Skip CORS preflight checks
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

