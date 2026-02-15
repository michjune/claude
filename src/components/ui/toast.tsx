"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type ToastVariant = VariantProps<typeof toastVariants>["variant"]

interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextValue {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
)

let toastCount = 0
function generateId() {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER
  return toastCount.toString()
}

// Global toast function reference
let globalAddToast: ((toast: Omit<ToastData, "id">) => void) | null = null

export function toast(props: Omit<ToastData, "id">) {
  if (globalAddToast) {
    globalAddToast(props)
  } else {
    console.warn("ToastProvider is not mounted. Cannot show toast.")
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = generateId()
    setToasts((prev) => [...prev, { ...toast, id }])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Register global toast function
  React.useEffect(() => {
    globalAddToast = addToast
    return () => {
      globalAddToast = null
    }
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return {
    toasts: context.toasts,
    toast: context.addToast,
    dismiss: context.removeToast,
  }
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:flex-col md:max-w-[420px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          data-state="open"
          className={cn(toastVariants({ variant: t.variant }))}
        >
          <div className="grid gap-1">
            {t.title && (
              <div className="text-sm font-semibold">{t.title}</div>
            )}
            {t.description && (
              <div className="text-sm opacity-90">{t.description}</div>
            )}
          </div>
          <button
            type="button"
            className="absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none"
            onClick={() => dismiss(t.id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
