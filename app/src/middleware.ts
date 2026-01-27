import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit, getRateLimitHeaders, getRouteType } from "./lib/rateLimit"

/**
 * Extracts user identifier from the request
 * Uses Authorization header if present, otherwise falls back to IP
 */
function getIdentifier(request: NextRequest): string {
  const authHeader = request.headers.get("authorization")

  if (authHeader?.startsWith("Bearer ")) {
    // Extract a hash of the token for identification
    // We don't decode the full token here for performance
    const token = authHeader.slice(7)
    // Use first 32 chars of token as identifier (enough for uniqueness)
    return `token:${token.slice(0, 32)}`
  }

  // Fall back to IP address
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "anonymous"
  return `ip:${ip}`
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Only apply rate limiting to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Skip rate limiting for public share endpoints (read-only, need to be accessible)
  if (pathname.startsWith("/api/share/") && method === "GET") {
    return NextResponse.next()
  }

  // Get user identifier
  const identifier = getIdentifier(request)

  // Determine rate limit type based on route and method
  const routeType = getRouteType(pathname, method)

  // Check rate limit
  const result = checkRateLimit(identifier, routeType)

  if (!result.allowed) {
    // Return 429 Too Many Requests
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Please wait ${result.retryAfter} seconds before trying again.`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter),
          ...getRateLimitHeaders(identifier, routeType),
        },
      }
    )
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  const headers = getRateLimitHeaders(identifier, routeType)

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: "/api/:path*",
}
