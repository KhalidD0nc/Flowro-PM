"use client"

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react"

export type ToastVariant = "success" | "error" | "warning" | "info"

export interface ToastData {
    id: string
    message: string
    variant: ToastVariant
    duration?: number
}

interface ToastProps {
    toast: ToastData
    onDismiss: (id: string) => void
}

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: string; iconColor: string }> = {
    success: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        icon: "check_circle",
        iconColor: "text-green-400",
    },
    error: {
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        icon: "error",
        iconColor: "text-red-400",
    },
    warning: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        icon: "warning",
        iconColor: "text-yellow-400",
    },
    info: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        icon: "info",
        iconColor: "text-blue-400",
    },
}

export function Toast({ toast, onDismiss }: ToastProps) {
    const [isExiting, setIsExiting] = useState(false)
    const styles = variantStyles[toast.variant]
    const duration = toast.duration ?? 5000

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true)
        }, duration - 300)

        const dismissTimer = setTimeout(() => {
            onDismiss(toast.id)
        }, duration)

        return () => {
            clearTimeout(timer)
            clearTimeout(dismissTimer)
        }
    }, [toast.id, duration, onDismiss])

    const handleDismiss = () => {
        setIsExiting(true)
        setTimeout(() => onDismiss(toast.id), 300)
    }

    return (
        <div
            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm
                ${styles.bg} ${styles.border}
                ${isExiting ? "animate-toast-out" : "animate-toast-in"}
            `}
            role="alert"
        >
            <span className={`material-symbols-outlined ${styles.iconColor}`}>
                {styles.icon}
            </span>
            <p className="text-white text-sm font-medium flex-1">{toast.message}</p>
            <button
                onClick={handleDismiss}
                className="text-[#9dabb9] hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                aria-label="Dismiss"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast toast={toast} onDismiss={onDismiss} />
                </div>
            ))}
        </div>
    )
}

// Toast Context for app-wide usage
interface ToastContextValue {
    toasts: ToastData[]
    addToast: (variant: ToastVariant, message: string, duration?: number) => void
    dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([])

    const addToast = useCallback((variant: ToastVariant, message: string, duration = 5000) => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts((prev) => [...prev, { id, variant, message, duration }])
    }, [])

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider")
    }

    return {
        toast: context.addToast,
        success: (message: string, duration?: number) => context.addToast("success", message, duration),
        error: (message: string, duration?: number) => context.addToast("error", message, duration),
        warning: (message: string, duration?: number) => context.addToast("warning", message, duration),
        info: (message: string, duration?: number) => context.addToast("info", message, duration),
        dismiss: context.dismissToast,
    }
}

