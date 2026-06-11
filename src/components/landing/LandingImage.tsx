'use client'

import { useState } from 'react'

interface LandingImageProps {
  /** Filename (no path) — e.g. "hero-main.webp". Must live in public/landing/ */
  filename: string
  /** Accessible alt text */
  alt: string
  /** Label shown in the placeholder box when image is missing */
  placeholderLabel: string
  /** Tailwind width/height classes for the placeholder. Default: "w-full" */
  className?: string
  /** Optional emoji shown inside the placeholder */
  placeholderIcon?: string
  /** Image element className when the real image is rendered */
  imageClassName?: string
  /**
   * Override: when `true`, always render the placeholder (skip the `<img>`).
   * When `false` or omitted, the component tries the `<img>` first and falls
   * back to the placeholder on error. This prop is useful for server-side
   * rendering where `fs.existsSync` can determine file presence, and for
   * deterministic tests.
   */
  forcePlaceholder?: boolean
}

/**
 * Renders a dashed-border placeholder box when the image file doesn't exist
 * at `public/landing/<filename>`, and renders an actual `<img>` tag when
 * the file is present.
 *
 * Two detection modes:
 * 1. **Client-side fallback** (default): renders `<img>` and catches `onError`
 *    to switch to the placeholder. Works automatically — just drop a file into
 *    `public/landing/` and it appears.
 * 2. **Deterministic override**: pass `forcePlaceholder={true}` to skip the
 *    `<img>` entirely. Use this when the server has already checked file
 *    existence via `fs.existsSync`.
 */
export function LandingImage({
  filename,
  alt,
  placeholderLabel,
  className = 'w-full',
  placeholderIcon,
  imageClassName = '',
  forcePlaceholder = false,
}: LandingImageProps) {
  const [imageError, setImageError] = useState(false)

  const src = `/landing/${filename}`

  // Show placeholder when forced or when client-side error was triggered
  if (forcePlaceholder || imageError) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100 ${className}`}
        data-testid={`landing-placeholder-${filename}`}
      >
        <div className="text-center">
          {placeholderIcon && (
            <span className="text-5xl" role="img" aria-label={placeholderLabel}>
              {placeholderIcon}
            </span>
          )}
          <p className="mt-4 text-lg font-medium text-gray-400">
            {placeholderLabel}
          </p>
        </div>
      </div>
    )
  }

  // Try rendering the real image — onError will trigger fallback
  return (
    <img
      src={src}
      alt={alt}
      className={imageClassName}
      onError={() => setImageError(true)}
      data-testid={`landing-image-${filename}`}
    />
  )
}
