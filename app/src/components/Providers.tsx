"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { User, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { ToastProvider } from "./ui/ToastProvider"
import { ThemeProvider } from "./ThemeProvider"
import { Provider as JotaiProvider } from "jotai"

interface AuthContextType {
    user: User | null
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true })

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    return (
        <JotaiProvider>
            <ThemeProvider>
                <AuthContext.Provider value={{ user, loading }}>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </AuthContext.Provider>
            </ThemeProvider>
        </JotaiProvider>
    )
}
