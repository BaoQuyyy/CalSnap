/**
 * Simple in-memory rate limiter (per IP, single-instance).
 * Uses a sliding window algorithm.
 */

const store = new Map<string, number[]>()

interface RateLimitOptions {
    limit: number    // max requests
    window: number   // window in seconds
}

interface RateLimitResult {
    success: boolean
    remaining: number
    reset: number    // epoch seconds when window resets
}

export function rateLimit(
    identifier: string,
    { limit, window: windowSec }: RateLimitOptions
): RateLimitResult {
    const now = Date.now()
    const windowMs = windowSec * 1000
    const cutoff = now - windowMs

    // Get and prune old timestamps
    const timestamps = (store.get(identifier) ?? []).filter((t) => t > cutoff)

    if (timestamps.length >= limit) {
        // Oldest request in window — that's when the window resets
        const oldest = timestamps[0] ?? now
        return {
            success: false,
            remaining: 0,
            reset: Math.ceil((oldest + windowMs) / 1000),
        }
    }

    timestamps.push(now)
    store.set(identifier, timestamps)

    return {
        success: true,
        remaining: limit - timestamps.length,
        reset: Math.ceil((now + windowMs) / 1000),
    }
}

// Clean up old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(
        () => {
            const cutoff = Date.now() - 5 * 60 * 1000
            for (const [key, timestamps] of store.entries()) {
                const pruned = timestamps.filter((t) => t > cutoff)
                if (pruned.length === 0) store.delete(key)
                else store.set(key, pruned)
            }
        },
        5 * 60 * 1000
    )
}
