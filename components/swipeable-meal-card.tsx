'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Trash, Loader2, Pencil } from 'lucide-react'
import { triggerHaptic } from '@/lib/feedback'

interface Props {
    children: React.ReactNode
    onDelete: () => void | Promise<void>
    onEdit?: () => void
    className?: string
    mealId?: string
}

const SWIPE_THRESHOLD = 60

export function SwipeableMealCard({ children, onDelete, onEdit, className = '', mealId }: Props) {
    const [offset, setOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const startX = useRef(0)
    const startOffset = useRef(0)
    const cardRef = useRef<HTMLDivElement>(null)
    const hasVibrated = useRef(false)

    // ── Shared drag logic ──
    const onDragStart = useCallback((clientX: number) => {
        startX.current = clientX
        startOffset.current = offset
        setIsDragging(true)
        hasVibrated.current = false
    }, [offset])

    const onDragMove = useCallback((clientX: number) => {
        if (!isDragging) return
        const delta = clientX - startX.current
        // Allow swiping between -100 (Delete) and 100 (Edit)
        const newOffset = Math.min(100, Math.max(-100, startOffset.current + delta))

        // Haptic feedback when hitting the edge
        if ((newOffset === 100 || newOffset === -100) && !hasVibrated.current) {
            triggerHaptic('light')
            hasVibrated.current = true
        } else if (newOffset > -100 && newOffset < 100) {
            hasVibrated.current = false
        }

        setOffset(newOffset)
    }, [isDragging])

    const onDragEnd = useCallback(() => {
        if (!isDragging) return
        setIsDragging(false)

        // If we swiped left past threshold -> Delete (Right side)
        if (offset < -SWIPE_THRESHOLD) {
            setOffset(-100)
            setIsOpen(true)
        }
        // If we swiped right past threshold -> Edit (Left side)
        else if (offset > SWIPE_THRESHOLD) {
            setOffset(100)
            setIsOpen(true)
            // Auto-trigger edit for better UX
            onEdit?.()
            // Reset after a short delay to feel "snappy"
            setTimeout(() => {
                setOffset(0)
                setIsOpen(false)
            }, 1000)
        }
        else {
            setOffset(0)
            setIsOpen(false)
        }
    }, [isDragging, offset])

    // ── Touch events (Mobile) ──
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        onDragStart(e.touches[0].clientX)
    }, [onDragStart])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        onDragMove(e.touches[0].clientX)
    }, [onDragMove])

    const handleTouchEnd = useCallback(() => {
        onDragEnd()
    }, [onDragEnd])

    // ── Mouse events (PC) ──
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only trigger on left click
        if (e.button !== 0) return
        onDragStart(e.clientX)
    }, [onDragStart])

    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            onDragMove(e.clientX)
        }
        const handleMouseUp = () => {
            onDragEnd()
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, onDragMove, onDragEnd])

    const handleDelete = async () => {
        if (deleting) return
        setDeleting(true)
        try {
            await onDelete()
        } finally {
            setDeleting(false)
        }
    }

    // Close button if user clicks the card while it's open (and not dragging)
    const handleCardClick = (e: React.MouseEvent) => {
        if (isOpen && !isDragging) {
            setOffset(0)
            setIsOpen(false)
        }
    }

    return (
        <div
            id={mealId ? `meal-${mealId}` : undefined}
            className={`relative overflow-hidden rounded-[2rem] group/swipe transition-all duration-500 ${className}`}
        >
            <div
                className="absolute inset-y-0 left-0 flex items-center justify-start w-[100px] z-30"
                style={{ opacity: Math.max(0, offset / 80) }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setOffset(0)
                        setIsOpen(false)
                        onEdit?.()
                    }}
                    className="flex flex-col items-center justify-center h-full w-full pl-2 gap-1 transition-all active:scale-95 text-slate-600 dark:text-slate-300"
                >
                    <div className="w-12 h-12 rounded-2xl ios-glass flex items-center justify-center mb-0.5 shadow-sm">
                        <Pencil className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Sửa</span>
                </button>
            </div>

            {/* Delete Button (Revealed on Swipe Left) - sits at RIGHT */}
            <div
                className="absolute inset-y-0 right-0 flex items-center justify-end w-[100px] z-30"
                style={{ opacity: Math.max(0, -offset / 80) }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleDelete()
                    }}
                    disabled={deleting}
                    className="flex flex-col items-center justify-center h-full w-full pr-2 gap-1 text-white disabled:opacity-70 transition-all active:scale-95"
                >
                    {deleting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-red-500 shadow-lg shadow-red-500/20 flex items-center justify-center mb-0.5">
                                <Trash className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 dark:text-red-400">Xóa</span>
                        </>
                    )}
                </button>
            </div>

            {isOpen && (
                <div
                    className="absolute inset-0 z-25"
                    onClick={() => {
                        setOffset(0)
                        setIsOpen(false)
                    }}
                />
            )}

            {/* Swipeable card content — sits at z-20. Supports both touch & mouse drag. */}
            <div
                ref={cardRef}
                onClick={handleCardClick}
                className={`relative z-20 select-none ${isDragging ? '' : 'transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]'}`}
                style={{
                    transform: `translateX(${offset}px)`,
                    cursor: isDragging ? 'grabbing' : isOpen ? 'pointer' : 'grab',
                    touchAction: 'pan-y' // Prevent browser back/forward swipe while dragging horizontally
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
            >
                {children}
            </div>
        </div>
    )
}
