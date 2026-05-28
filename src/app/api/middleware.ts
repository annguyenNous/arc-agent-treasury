import { NextRequest, NextResponse } from 'next/server';

/**
 * API Authentication Middleware
 * 
 * Checks for 'x-api-key' header matching process.env.API_SECRET.
 * If API_SECRET is not set, allows all requests (development mode).
 * 
 * @returns null if valid, NextResponse with 401 if invalid
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiSecret = process.env.API_SECRET;

  // If no API_SECRET is configured, allow all requests (development mode)
  if (!apiSecret) {
    return null;
  }

  const providedKey = request.headers.get('x-api-key');

  if (!providedKey || providedKey !== apiSecret) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid x-api-key header',
      },
      { status: 401 }
    );
  }

  return null; // Valid
}
