// User profile schema and Firestore CRUD operations for onboarding state

import { db } from "./firebase"
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"

// User profile schema
export interface UserProfile {
    userId: string
    onboardingCompleted: boolean
    onboardingStep: number
    role?: "founder" | "pm" | "developer" | "designer" | "other"
    projectType?: "saas" | "mobile" | "ecommerce" | "internal" | "other"
    completedTours: string[]
    createdAt: Date | null
    updatedAt: Date | null
}

// Default profile for new users
export const defaultProfile: Omit<UserProfile, "userId" | "createdAt" | "updatedAt"> = {
    onboardingCompleted: false,
    onboardingStep: 0,
    completedTours: [],
}

// Onboarding checklist items
export interface OnboardingChecklistItem {
    id: string
    title: string
    description: string
    completed: boolean
    action?: string
}

export const onboardingChecklistItems: Omit<OnboardingChecklistItem, "completed">[] = [
    {
        id: "create_project",
        title: "Create your first project",
        description: "Start by creating a new project to generate a blueprint",
        action: "/app",
    },
    {
        id: "generate_blueprint",
        title: "Generate a blueprint",
        description: "Chat with AI to generate your Unified Blueprint",
    },
    {
        id: "review_edit",
        title: "Review and edit",
        description: "Fine-tune your blueprint with manual edits or AI assistance",
    },
    {
        id: "save_version",
        title: "Save a version",
        description: "Lock your blueprint to create a versioned snapshot",
    },
    {
        id: "export_share",
        title: "Export or share",
        description: "Download your blueprint or share it with your team",
    },
]

// Get user profile from Firestore
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, "userProfiles", userId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
            const data = docSnap.data()
            return {
                userId,
                onboardingCompleted: data.onboardingCompleted ?? false,
                onboardingStep: data.onboardingStep ?? 0,
                role: data.role,
                projectType: data.projectType,
                completedTours: data.completedTours ?? [],
                createdAt: data.createdAt?.toDate() ?? null,
                updatedAt: data.updatedAt?.toDate() ?? null,
            }
        }

        return null
    } catch (error) {
        console.error("Error fetching user profile:", error)
        return null
    }
}

// Create a new user profile
export async function createUserProfile(userId: string): Promise<UserProfile> {
    try {
        const docRef = doc(db, "userProfiles", userId)
        const profileData = {
            ...defaultProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }

        await setDoc(docRef, profileData)

        return {
            userId,
            ...defaultProfile,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    } catch (error) {
        console.error("Error creating user profile:", error)
        throw error
    }
}

// Update user profile
export async function updateUserProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
    try {
        const docRef = doc(db, "userProfiles", userId)
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        })
    } catch (error) {
        console.error("Error updating user profile:", error)
        throw error
    }
}

// Complete onboarding
export async function completeOnboarding(userId: string): Promise<void> {
    await updateUserProfile(userId, {
        onboardingCompleted: true,
        onboardingStep: -1, // -1 indicates completed
    })
}

// Update onboarding step
export async function updateOnboardingStep(userId: string, step: number): Promise<void> {
    await updateUserProfile(userId, {
        onboardingStep: step,
    })
}

// Save onboarding answers (role and project type)
export async function saveOnboardingAnswers(
    userId: string,
    role: UserProfile["role"],
    projectType: UserProfile["projectType"]
): Promise<void> {
    await updateUserProfile(userId, {
        role,
        projectType,
        onboardingStep: 2, // Move to next step after answering questions
    })
}

// Mark a tour as completed
export async function markTourCompleted(userId: string, tourId: string): Promise<void> {
    const profile = await getUserProfile(userId)
    if (!profile) return

    const completedTours = [...(profile.completedTours || [])]
    if (!completedTours.includes(tourId)) {
        completedTours.push(tourId)
        await updateUserProfile(userId, { completedTours })
    }
}

// Check if a tour has been completed
export async function hasTourBeenCompleted(userId: string, tourId: string): Promise<boolean> {
    const profile = await getUserProfile(userId)
    return profile?.completedTours?.includes(tourId) ?? false
}

// Get or create user profile (ensures profile exists)
export async function getOrCreateUserProfile(userId: string): Promise<UserProfile> {
    const existing = await getUserProfile(userId)
    if (existing) return existing
    return createUserProfile(userId)
}
