import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"

export interface AuthResult {
    userId: string
    token: string
}

export interface AuthError {
    error: string
    status: number
}

/**
 * Verifies the Firebase auth token from the request headers
 * Returns the user ID if valid, or an error response if invalid
 */
export async function verifyAuthToken(
    request: NextRequest
): Promise<AuthResult | AuthError> {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader?.startsWith("Bearer ")) {
        return { error: "Unauthorized", status: 401 }
    }

    try {
        const token = authHeader.replace("Bearer ", "")
        const decodedToken = await adminAuth.verifyIdToken(token)

        return {
            userId: decodedToken.uid,
            token,
        }
    } catch {
        return { error: "Invalid token", status: 401 }
    }
}

/**
 * Type guard to check if the result is an error
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
    return "error" in result
}

/**
 * Creates an unauthorized response
 */
export function unauthorizedResponse(error: AuthError): NextResponse {
    return NextResponse.json({ error: error.error }, { status: error.status })
}
