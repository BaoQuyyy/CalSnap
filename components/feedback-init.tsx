'use client'

import { useEffect } from 'react'
import { initFeedbackSystem } from '@/lib/feedback'

/**
 * Initializes the audio context on first user interaction.
 * Required for iOS Safari to allow Web Audio API playback.
 * Renders nothing — include once at the app root.
 */
export function FeedbackInit() {
    useEffect(() => {
        const cleanup = initFeedbackSystem()
        return cleanup
    }, [])

    return null
}
