/**
 * Premium haptic & audio feedback system.
 * Works on iOS (via Web Audio API) and Android (via Vibration API + Audio).
 */

export const HAPTIC_TYPES = {
    LIGHT: 'light',
    MEDIUM: 'medium',
    HEAVY: 'heavy',
    SUCCESS: 'success',
    ERROR: 'error',
    NOTIFICATION: 'notification',
} as const;

export type HapticType = typeof HAPTIC_TYPES[keyof typeof HAPTIC_TYPES];

// Reuse AudioContext for performance
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (audioCtx && audioCtx.state !== 'closed') return audioCtx;
    try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
        return audioCtx;
    } catch { return null; }
}

// Resume audio context (needed after user interaction on iOS)
async function ensureAudioReady(): Promise<AudioContext | null> {
    const ctx = getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch { return null; }
    }
    return ctx;
}

/**
 * Play a subtle haptic-like audio feedback.
 * Different profiles for different interaction types.
 */
async function playHapticSound(type: HapticType): Promise<void> {
    const ctx = await ensureAudioReady();
    if (!ctx) return;

    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        switch (type) {
            case 'light':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.015);
                gain.gain.setValueAtTime(0.03, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
                osc.start(now);
                osc.stop(now + 0.015);
                break;

            case 'medium':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
                osc.start(now);
                osc.stop(now + 0.03);
                break;

            case 'heavy':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.start(now);
                osc.stop(now + 0.06);
                break;

            case 'success': {
                // Two-tone chime (like iOS success)
                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.connect(gain2);
                gain2.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);

                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(1320, now + 0.06);
                gain2.gain.setValueAtTime(0.001, now);
                gain2.gain.linearRampToValueAtTime(0.05, now + 0.06);
                gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc2.start(now + 0.06);
                osc2.stop(now + 0.15);
                break;
            }

            case 'error':
                osc.type = 'square';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.linearRampToValueAtTime(150, now + 0.1);
                gain.gain.setValueAtTime(0.04, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;

            case 'notification': {
                // Three quick ascending notes
                const notes = [660, 880, 1100];
                notes.forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.type = 'sine';
                    const t = now + i * 0.06;
                    o.frequency.setValueAtTime(freq, t);
                    g.gain.setValueAtTime(0.04, t);
                    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                    o.start(t);
                    o.stop(t + 0.05);
                });
                // Silence the main osc (separate notes used above)
                gain.gain.setValueAtTime(0, now);
                osc.start(now);
                osc.stop(now + 0.01);
                break;
            }
        }
    } catch {
        // Audio blocked by browser policy — silently fail
    }
}

/**
 * Trigger haptic feedback. Uses vibration on Android + audio feedback on all platforms.
 */
export const triggerHaptic = (type: HapticType = 'light') => {
    // 1. Try native vibration (Android only — iOS Safari does not support Vibration API)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
            switch (type) {
                case 'light': navigator.vibrate(8); break;
                case 'medium': navigator.vibrate(15); break;
                case 'heavy': navigator.vibrate(25); break;
                case 'success': navigator.vibrate([10, 30, 15]); break;
                case 'error': navigator.vibrate([20, 10, 20]); break;
                case 'notification': navigator.vibrate([8, 20, 8, 20, 8]); break;
            }
        } catch { }
    }

    // 2. Always play audio feedback (works on iOS + Android after user interaction)
    playHapticSound(type);
};

const FEEDBACK_SOUND_MAP: Record<string, HapticType> = {
    tick: 'light',
    tap: 'medium',
    pop: 'success',
};

/**
 * Play a subtle UI feedback sound (for non-haptic contexts).
 * E.g., navigation ticks, button taps.
 */
export const playFeedbackSound = (type: 'tick' | 'tap' | 'pop' = 'tick') => {
    playHapticSound(FEEDBACK_SOUND_MAP[type] || 'light');
};

/**
 * Initialize audio context on first user interaction.
 * Call this once on app mount to ensure iOS audio works.
 * Returns a cleanup function to remove event listeners.
 */
export const initFeedbackSystem = (): (() => void) => {
    if (typeof window === 'undefined') return () => {};

    const handler = () => {
        ensureAudioReady();
    };

    window.addEventListener('touchstart', handler, { once: true, passive: true });
    window.addEventListener('click', handler, { once: true });

    return () => {
        window.removeEventListener('touchstart', handler);
        window.removeEventListener('click', handler);
    };
};
