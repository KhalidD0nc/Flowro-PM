"use client"

import { createContext, useCallback, useState, ReactNode } from "react"
import { ToastContainer, ToastData, ToastVariant } from "./Toast"

interface ToastContextType {
    showToast: (message: string, variant?: ToastVariant, duration?: number) => void
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
}

export const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([])

    const showToast = useCallback((message: string, variant: ToastVariant = "info", duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        setToasts((prev) => [...prev, { id, message, variant, duration }])
    }, [])

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const success = useCallback((message: string) => showToast(message, "success"), [showToast])
    const error = useCallback((message: string) => showToast(message, "error"), [showToast])
    const warning = useCallback((message: string) => showToast(message, "warning"), [showToast])
    const info = useCallback((message: string) => showToast(message, "info"), [showToast])

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    )
}
