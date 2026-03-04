'use client'

import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string, options?: { onClick?: () => void;[key: string]: any }) => {
    const { onClick, ...rest } = options || {}
    sonnerToast.success(message, {
      duration: 5000,
      ...rest,
      ...(onClick
        ? {
          action: {
            label: '👆 Xem ngay',
            onClick,
          },
        }
        : {}),
    })
  },
  error: (message: string, options?: any) => {
    sonnerToast.error(message, { duration: 4000, ...options })
  },
}
