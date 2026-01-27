"use client"

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg"
    color?: string
    className?: string
}

export function LoadingSpinner({
    size = "md",
    color = "#137fec",
    className = ""
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: "size-4",
        md: "size-5",
        lg: "size-8"
    }

    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill={color}
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    )
}

interface LoadingOverlayProps {
    isLoading: boolean
    message?: string
    children: React.ReactNode
    className?: string
}

export function LoadingOverlay({
    isLoading,
    message = "Loading...",
    children,
    className = ""
}: LoadingOverlayProps) {
    return (
        <div className={`relative ${className}`}>
            {children}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#101922]/80 backdrop-blur-sm rounded-lg z-50">
                    <div className="flex flex-col items-center gap-3">
                        <LoadingSpinner size="lg" />
                        {message && (
                            <span className="text-white text-sm font-medium">{message}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

interface ButtonWithLoadingProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
    loadingText?: string
    children: React.ReactNode
}

export function ButtonWithLoading({
    isLoading = false,
    loadingText,
    children,
    disabled,
    className = "",
    ...props
}: ButtonWithLoadingProps) {
    return (
        <button
            disabled={disabled || isLoading}
            className={className}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" color="currentColor" />
                    <span>{loadingText || "Loading..."}</span>
                </span>
            ) : (
                children
            )}
        </button>
    )
}
