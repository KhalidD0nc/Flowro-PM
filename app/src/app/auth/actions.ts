"use client"

import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    UserCredential
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

/**
 * User data interface for Firestore
 */
interface UserData {
    uid: string
    email: string | null
    displayName: string | null
    photoURL: string | null
    createdAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
}

/**
 * Sanitizes user input to prevent XSS and ensure data quality
 * @param input - Raw string input
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized string
 */
function sanitizeInput(input: string | undefined | null, maxLength = 100): string | null {
    if (!input) return null

    return input
        .trim()
        .slice(0, maxLength)
        // Remove any HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove control characters
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if email is valid
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 320
}

/**
 * Signs in the user with Google OAuth
 * @returns Promise that resolves when sign-in is complete
 * @throws Error if sign-in fails
 */
export async function signInWithGoogle(): Promise<void> {
    try {
        const provider = new GoogleAuthProvider()
        // Add custom parameters for better debugging
        provider.setCustomParameters({
            prompt: 'select_account'
        })

        console.log('Attempting Google Sign-In...')
        const result = await signInWithPopup(auth, provider)
        console.log('Google Sign-In successful:', result.user.email)

        // Store user in Firestore if first time
        await storeUserInFirestore(result)
        console.log('User stored in Firestore successfully')
    } catch (error: any) {
        console.error('Google Sign-In Error Details:', {
            code: error.code,
            message: error.message,
            stack: error.stack,
            customData: error.customData
        })
        throw error
    }
}

/**
 * Signs in the user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise that resolves with UserCredential when sign-in is complete
 * @throws Error if sign-in fails
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
    // Validate email format
    const sanitizedEmail = sanitizeInput(email, 320)
    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
        throw new Error("auth/invalid-email")
    }

    // Password validation (min 6 chars - Firebase requirement)
    if (!password || password.length < 6) {
        throw new Error("auth/weak-password")
    }

    const result = await signInWithEmailAndPassword(auth, sanitizedEmail, password)
    return result
}

/**
 * Creates a new user account with email and password
 * Stores user data in Firestore Users collection after successful registration
 * @param email - User's email address
 * @param password - User's password
 * @param displayName - User's display name (optional)
 * @returns Promise that resolves with UserCredential when sign-up is complete
 * @throws Error if sign-up fails
 */
export async function signUp(
    email: string,
    password: string,
    displayName?: string
): Promise<UserCredential> {
    // Validate and sanitize email
    const sanitizedEmail = sanitizeInput(email, 320)
    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
        throw new Error("auth/invalid-email")
    }

    // Password validation
    if (!password || password.length < 6) {
        throw new Error("auth/weak-password")
    }

    // Sanitize display name
    const sanitizedDisplayName = sanitizeInput(displayName, 100)

    // Create the user account
    const result = await createUserWithEmailAndPassword(auth, sanitizedEmail, password)

    // Update the user's display name if provided
    if (sanitizedDisplayName && result.user) {
        await updateProfile(result.user, { displayName: sanitizedDisplayName })
    }

    // Store user data in Firestore
    await storeUserInFirestore(result, sanitizedDisplayName)

    return result
}

/**
 * Sends a password reset email to the specified email address
 * @param email - User's email address
 * @throws Error if sending fails
 */
export async function resetPassword(email: string): Promise<void> {
    // Validate email format
    const sanitizedEmail = sanitizeInput(email, 320)
    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
        throw new Error("auth/invalid-email")
    }

    await sendPasswordResetEmail(auth, sanitizedEmail)
}

/**
 * Stores user data in Firestore Users collection
 * @param userCredential - The user credential from Firebase Auth
 * @param displayName - Optional display name to override
 */
async function storeUserInFirestore(
    userCredential: UserCredential,
    displayName?: string | null
): Promise<void> {
    const user = userCredential.user
    const userRef = doc(db, "Users", user.uid)

    // Check if user already exists
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
        // Create new user document with sanitized data
        const userData: UserData = {
            uid: user.uid,
            email: user.email,
            displayName: sanitizeInput(displayName || user.displayName, 100),
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }

        await setDoc(userRef, userData)
    } else {
        // Update existing user's last login
        await setDoc(userRef, {
            updatedAt: serverTimestamp()
        }, { merge: true })
    }
}

/**
 * Signs out the current user
 * @returns Promise that resolves when sign-out is complete
 * @throws Error if sign-out fails
 */
export async function signOutUser(): Promise<void> {
    await firebaseSignOut(auth)
}
