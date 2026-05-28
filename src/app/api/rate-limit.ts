import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory rate limiter
 * 30 requests per minute per IP address
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000; // 1 minute

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
    rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Check rate limit for a request
 * 
 * @returns { allowed: boolean, response?: NextResponse }
 *   - allowed: true if request should proceed
 *   - response: 429 NextResponse if rate limit exceeded
 */
export function checkRateLimit(request: NextRequest): { allowed: boolean; response?: NextResponse } {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown';

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
          retryAfterSeconds,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      ),
    };
  }

  entry.count++;
  return { allowed: true };
}
