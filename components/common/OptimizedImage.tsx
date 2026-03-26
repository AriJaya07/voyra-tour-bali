"use client"

import { useState, useCallback } from "react"
import Image, { type ImageProps } from "next/image"

const DEFAULT_FALLBACK = "/images/destinations/gwk.png"

interface OptimizedImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallbackSrc?: string
}

export default function OptimizedImage({
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  className = "",
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true)
      setIsLoaded(true)
    }
  }, [hasError])

  const src = hasError ? fallbackSrc : props.src

  return (
    <>
      {/* Skeleton placeholder — visible until image loads */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-[inherit]" />
      )}

      <Image
        {...props}
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  )
}
