import { NextResponse } from 'next/server'
import { AuthenticationError, AuthorizationError } from '@/lib/auth'

// ---------------------------------------------------------------------------
// Custom error classes for route guards
// ---------------------------------------------------------------------------

/** Thrown when a requested resource is not found. */
export class NotFoundError extends Error {
  public readonly status = 404

  constructor(message = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }

  toResponse(): NextResponse {
    return NextResponse.json({ error: this.message }, { status: this.status })
  }
}

// ---------------------------------------------------------------------------
// parseBody — safely parse JSON from a NextRequest
// ---------------------------------------------------------------------------

/**
 * Parse the JSON body from a `NextRequest`.
 *
 * Returns `{ body, error }` — exactly one is defined:
 * - On success: `{ body: T }` with the parsed value.
 * - On failure: `{ error: NextResponse }` with a 400 JSON response.
 *
 * Usage inside a route handler:
 * ```ts
 * const { body, error } = await parseBody<CreateTodoBody>(request)
 * if (error) return error
 * ```
 */
export async function parseBody<T>(
  request: Request,
): Promise<{ body: T; error?: undefined } | { body?: undefined; error: NextResponse }> {
  try {
    const body = (await request.json()) as T
    return { body }
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    }
  }
}

// ---------------------------------------------------------------------------
// handleRouteError — unified error → NextResponse mapping
// ---------------------------------------------------------------------------

/**
 * Convert a caught error to the appropriate `NextResponse`.
 *
 * Recognised error types:
 * - `AuthenticationError` → 401
 * - `AuthorizationError`  → 403
 * - `NotFoundError`       → 404
 * - `Error` (generic)     → 500 with the message (in non-production) or a
 *                            generic message (in production).
 * - non-Error throws      → re-thrown (preserves crash semantics for
 *                            primitives like strings or numbers).
 *
 * Usage inside a route handler:
 * ```ts
 * try {
 *   return await withAuth(request, async (user) => { ... })
 * } catch (err) {
 *   return handleRouteError(err)
 * }
 * ```
 */
export function handleRouteError(err: unknown): NextResponse | never {
  if (err instanceof AuthenticationError) return err.toResponse()
  if (err instanceof AuthorizationError) return err.toResponse()
  if (err instanceof NotFoundError) return err.toResponse()

  if (err instanceof Error) {
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error'

    return NextResponse.json({ error: message }, { status: 500 })
  }

  // Non-Error throws (string, number, etc.) — re-throw to preserve crash semantics
  throw err
}
