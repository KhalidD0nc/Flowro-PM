"use client"

import { signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth"
import { auth } from "@/lib/firebase"

/**
 * Signs in the user with Google OAuth
 * @returns Promise that resolves when sign-in is complete
 * @throws Error if sign-in fails
 */
export async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
}

/**
 * Signs out the current user
 * @returns Promise that resolves when sign-out is complete
 * @throws Error if sign-out fails
 */
export async function signOutUser(): Promise<void> {
    await firebaseSignOut(auth)
}
