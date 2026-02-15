"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
  size?: "sm" | "default" | "lg"
}

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  default: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "default", ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    const showFallback = !src || imageError

    const initials = React.useMemo(() => {
      if (fallback) return fallback
      if (!alt) return "?"
      return alt
        .split(" ")
        .map((word) => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    }, [alt, fallback])

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted",
          avatarSizes[size],
          className
        )}
        {...props}
      >
        {showFallback ? (
          <span className="font-medium text-muted-foreground">{initials}</span>
        ) : (
          <img
            src={src}
            alt={alt ?? ""}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

export { Avatar }
export type { AvatarProps }
