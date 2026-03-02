'use client'

import { useState } from 'react'
import { Share2, Trophy, X } from 'lucide-react'

interface ShareAchievementProps {
  streak: number
  journeyScore: number
  milestone: string
}

export function ShareAchievement({
  streak,
  journeyScore,
  milestone,
}: ShareAchievementProps) {
  const [show, setShow] = useState(false)

  const shouldShow = streak >= 3 || journeyScore >= 70
  if (!shouldShow) return null

  const shareText = `🏆 CalSnap Journey Update!
✅ ${streak} ngày streak
💪 ${journeyScore}% tuần này
🎯 ${milestone}

Đang theo đúng kế hoạch dinh dưỡng! 💚`

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'CalSnap Achievement', text: shareText })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText)
      }
    } finally {
      setShow(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-200 text-emerald-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
      >
        <Share2 size={16} /> Chia sẻ thành tích
      </button>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800">Thành tích của bạn 🎉</h3>
              <button onClick={() => setShow(false)}>
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="hoverboard-gradient rounded-2xl p-5 text-white text-center mb-4">
              <Trophy
                size={32}
                className="mx-auto mb-2"
                fill="currentColor"
              />
              <p className="font-black text-xl">{milestone}</p>
              <p className="text-emerald-100 text-sm mt-1">
                {streak} ngày streak · {journeyScore}% tuần này
              </p>
            </div>
            <button
              onClick={handleShare}
              className="w-full py-3.5 rounded-2xl hoverboard-gradient text-white font-bold flex items-center justify-center gap-2"
            >
              <Share2 size={18} /> Chia sẻ ngay
            </button>
          </div>
        </div>
      )}
    </>
  )
}

