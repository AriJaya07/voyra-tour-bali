"use client"

import { useState, useCallback, ReactNode } from "react"
import Image, { type ImageProps } from "next/image"
import VoryaIcon from "../assets/Icon/VoyraIcon"

const DEFAULT_FALLBACK = <VoryaIcon className="w-16 h-16 opacity-20" />

// These CDNs already serve optimized images — no need to route through Vercel optimizer
const SKIP_OPTIMIZATION_DOMAINS = [
  'hare-media-cdn.tripadvisor.com',
  'media-cdn.tripadvisor.com',
  'media.tacdn.com',
  'dynamic-media.tacdn.com',
  'viator.com',
  'cloudinary.com',
]

function shouldSkipOptimization(src: string): boolean {
  if (!src || !src.startsWith('http')) return false
  try {
    const hostname = new URL(src).hostname
    return SKIP_OPTIMIZATION_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith('.' + d)
    )
  } catch {
    return false
  }
}

interface OptimizedImageProps extends Omit<ImageProps, "onError" | "onLoad"> {
  fallbackSrc?: ReactNode
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
    setHasError(true)
    setIsLoaded(true)
  }, [])

  const skipOptimize = shouldSkipOptimization(String(props.src))

  // If there is an error or the src is missing, render the fallback component (Icon)
  if (!props.src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-[inherit] overflow-hidden ${className} ${props.fill ? 'absolute inset-0' : ''}`}
        style={!props.fill ? { width: props.width, height: props.height } : {}}
      >
        {fallbackSrc}
      </div>
    )
  }

  return (
    <>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-[inherit] z-10" />
      )}

      <Image
        loading={props.priority ? undefined : "lazy"}
        {...props}
        unoptimized={props.unoptimized ?? skipOptimize}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  )
}
