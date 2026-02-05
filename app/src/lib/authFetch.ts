/**
 * Authenticated Fetch Utility
 * 
 * Centralized wrapper for making authenticated API calls.
 * Automatically attaches Firebase ID token to requests.
 */

import { User } from "firebase/auth"

export interface AuthFetchOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>
}

/**
 * Makes an authenticated fetch request with Firebase ID token
 * 
 * @param url - The URL to fetch
 * @param user - Firebase User object (must be authenticated)
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise<Response>
 * @throws Error if user is null or token retrieval fails
 */
export async function authFetch(
    url: string,
    user: User | null,
    options: AuthFetchOptions = {}
): Promise<Response> {
    if (!user) {
        throw new Error("User must be authenticated to make this request")
    }

    const token = await user.getIdToken()
    
    const headers: Record<string, string> = {
        ...options.headers,
        "Authorization": `Bearer ${token}`,
    }

    // Add Content-Type for JSON bodies if not already set
    if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json"
    }

    return fetch(url, {
        ...options,
        headers,
    })
}

/**
 * Makes an authenticated GET request
 */
export async function authGet(url: string, user: User | null): Promise<Response> {
    return authFetch(url, user, { method: "GET" })
}

/**
 * Makes an authenticated POST request with JSON body
 */
export async function authPost<T>(
    url: string,
    user: User | null,
    body: T
): Promise<Response> {
    return authFetch(url, user, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
}

/**
 * Makes an authenticated PUT request with JSON body
 */
export async function authPut<T>(
    url: string,
    user: User | null,
    body: T
): Promise<Response> {
    return authFetch(url, user, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
}

/**
 * Makes an authenticated DELETE request
 */
export async function authDelete(url: string, user: User | null): Promise<Response> {
    return authFetch(url, user, { method: "DELETE" })
}

/**
 * Makes an authenticated PATCH request with JSON body
 */
export async function authPatch<T>(
    url: string,
    user: User | null,
    body: T
): Promise<Response> {
    return authFetch(url, user, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
}
