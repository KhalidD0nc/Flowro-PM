"use client"

import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
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
 * Signs in the user with Google OAuth
 * @returns Promise that resolves when sign-in is complete
 * @throws Error if sign-in fails
 */
export async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
                          
    // Store user in Firestore if first time
    await storeUserInFirestore(result)
}

/**
 * Signs in the user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise that resolves with UserCredential when sign-in is complete
 * @throws Error if sign-in fails
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
    const result = await signInWithEmailAndPassword(auth, email, password)
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
    // Create the user account
    const result = await createUserWithEmailAndPassword(auth, email, password)

    // Update the user's display name if provided
    if (displayName && result.user) {
        await updateProfile(result.user, { displayName })
    }

    // Store user data in Firestore
    await storeUserInFirestore(result, displayName)

    return result
}

/**
 * Stores user data in Firestore Users collection
 * @param userCredential - The user credential from Firebase Auth
 * @param displayName - Optional display name to override
 */
async function storeUserInFirestore(
    userCredential: UserCredential,
    displayName?: string
): Promise<void> {
    const user = userCredential.user
    const userRef = doc(db, "Users", user.uid)

    // Check if user already exists
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
        // Create new user document
        const userData: UserData = {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.displayName,
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
