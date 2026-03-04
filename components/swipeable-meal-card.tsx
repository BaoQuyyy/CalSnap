'use client'

import { useRef, useState, useCallback } from 'react'
import { Trash, Loader2 } from 'lucide-react'

interface Props {
    children: React.ReactNode
    onDelete: () => void | Promise<void>
    className?: string
}

const SWIPE_THRESHOLD = 60 // px to reveal the delete button

export function SwipeableMealCard({ children, onDelete, className = '' }: Props) {
    const [offset, setOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const startX = useRef(0)
    const startOffset = useRef(0)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX
        startOffset.current = offset
        setIsDragging(true)
    }, [offset])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return
        const delta = e.touches[0].clientX - startX.current
        const newOffset = Math.min(0, Math.max(-120, startOffset.current + delta))
        setOffset(newOffset)
    }, [isDragging])

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false)
        if (offset < -SWIPE_THRESHOLD) {
            setOffset(-100) // Increase reveal width for better visibility
            setIsOpen(true)
        } else {
            setOffset(0)
            setIsOpen(false)
        }
    }, [offset])

    const handleDelete = async () => {
        if (deleting) return
        setDeleting(true)
        await onDelete()
        setDeleting(false)
    }

    const close = () => {
        setOffset(0)
        setIsOpen(false)
    }

    return (
        <div className={`relative overflow-hidden rounded-[2rem] group/swipe ${className}`}>
            {/* Delete button revealed on swipe - Increased width and Z-index */}
            <div className="absolute inset-y-0 right-0 flex items-center justify-end w-[100px] bg-red-600 dark:bg-red-500 rounded-r-[2rem] z-10">
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    aria-label="Xóa bữa ăn"
                    className="flex flex-col items-center justify-center h-full w-full pr-2 gap-1 text-white disabled:opacity-70 transition-colors active:bg-red-700"
                >
                    {deleting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <>
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-0.5 shadow-sm">
                                <Trash className="h-4.5 w-4.5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Xóa</span>
                        </>
                    )}
                </button>
            </div>

            {/* Overlay to close when tapping outside */}
            {isOpen && (
                <div
                    className="absolute inset-0 z-30"
                    style={{ right: 100 }}
                    onClick={close}
                />
            )}

            {/* Swipeable card - Increased Z-index to stay above delete but below FAB */}
            <div
                className={`relative z-20 ${isDragging ? '' : 'transition-transform duration-300 var(--ios-bezier)'}`}
                style={{ transform: `translateX(${offset}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    )
}
