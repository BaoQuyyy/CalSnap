'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Flame, Star, Zap, Scan, Activity, ArrowRight, ShieldCheck, Github } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function IOSLandingPage() {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('ios-visible')
                    }
                })
            },
            { threshold: 0.1 }
        )

        const elements = document.querySelectorAll('.ios-reveal')
        elements.forEach((el) => observer.observe(el))

        return () => observer.disconnect()
    }, [])

    return (
        <div className="min-h-screen bg-[#fcfcfc] text-[#1d1d1f] font-sans selection:bg-emerald-100 selection:text-emerald-900">
            {/* --- FONTS --- */}
            <link
                href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Fraunces:ital,wght@0,300;0,500;0,700;1,300;1,500&display=swap"
                rel="stylesheet"
            />

            <style jsx global>{`
        :root {
          --ios-bg: #f5f5f7;
          --ios-text: #1d1d1f;
          --ios-accent: #34c759;
          --ios-glass: rgba(255, 255, 255, 0.7);
        }

        .font-be { font-family: 'Be Vietnam Pro', sans-serif; }
        .font-fraunces { font-family: 'Fraunces', serif; }

        @keyframes iosFadeUp {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .ios-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .ios-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .glass-nav {
          background: rgba(252, 252, 252, 0.8);
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
        }

        .ios-btn-primary {
          background: #1d1d1f;
          color: white;
          padding: 12px 24px;
          border-radius: 99px;
          font-weight: 600;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ios-btn-primary:hover {
          transform: scale(1.02);
          background: #000000;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .ios-card {
          background: white;
          border-radius: 2.5rem;
          padding: 2.5rem;
          transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
          border: 1px solid rgba(0,0,0,0.03);
        }

        .ios-card:hover {
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 30px 60px rgba(0,0,0,0.06);
        }

        .mask-image {
          mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
        }
      `}</style>

            {/* --- NAVIGATION --- */}
            <nav className="fixed top-0 w-full z-50 glass-nav border-b border-black/5 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:rotate-12 transition-transform">
                            <Flame size={18} fill="currentColor" />
                        </div>
                        <span className="text-lg font-black tracking-tight font-be">CalSnap</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-black/60 font-be">
                        <Link href="#features" className="hover:text-black transition-colors">Tính năng</Link>
                        <Link href="#how-it-works" className="hover:text-black transition-colors">Cách hoạt động</Link>
                        <Link href="/log" className="hover:text-black transition-colors">Nhật ký</Link>
                        <Link href="/scan" className="ios-btn-primary ml-4">Bắt đầu ngay</Link>
                    </div>

                    <button className="md:hidden w-8 h-8 flex flex-col justify-center items-end gap-1.5 focus:outline-none">
                        <div className="w-6 h-0.5 bg-black rounded-full" />
                        <div className="w-4 h-0.5 bg-black rounded-full" />
                    </button>
                </div>
            </nav>

            <main className="pt-24 font-be overflow-hidden">
                {/* --- HERO SECTION --- */}
                <section className="px-6 py-20 md:py-32 max-w-6xl mx-auto text-center relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-50/50 rounded-full blur-[120px] -z-10 animate-pulse duration-[10s]" />

                    <div className="ios-reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold tracking-widest uppercase mb-8 border border-emerald-100">
                        <Zap size={12} fill="currentColor" />
                        <span>AI-Powered Nutrition</span>
                    </div>

                    <h1 className="ios-reveal text-5xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 font-be delay-100">
                        Dinh dưỡng <br />
                        <span className="font-fraunces italic font-light tracking-normal text-emerald-600">trong tầm tay.</span>
                    </h1>

                    <p className="ios-reveal max-w-2xl mx-auto text-lg md:text-xl text-black/50 leading-relaxed font-medium mb-12 delay-200">
                        Chụp ảnh món ăn, CalSnap lo phần còn lại. Theo dõi Calories, Macro và tiến trình sức khỏe của bạn chỉ trong vài giây với công nghệ AI hàng đầu.
                    </p>

                    <div className="ios-reveal flex flex-col md:flex-row items-center justify-center gap-4 delay-300">
                        <Link href="/scan" className="ios-btn-primary px-10 py-5 text-base flex items-center gap-2 group">
                            Thử ngay miễn phí
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="#features" className="px-10 py-5 rounded-full font-bold text-black/60 hover:text-black transition-colors">
                            Khám phá thêm
                        </Link>
                    </div>

                    <div className="ios-reveal mt-20 relative max-w-5xl mx-auto delay-500">
                        <div className="ios-card overflow-hidden p-0 bg-slate-50 border-8 border-white shadow-2xl">
                            <div className="aspect-[16/9] w-full bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <Scan size={80} className="text-white opacity-20 animate-pulse" />
                                    <div className="mt-8 flex gap-3">
                                        {[1, 2, 3, 4].map(i => (
                                            <div key={i} className="w-12 h-1.5 rounded-full bg-white/20 animate-shimmer" style={{ animationDelay: `${i * 0.2}s` }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Ghost UI Elements */}
                                <div className="absolute bottom-8 left-8 right-8 flex gap-4">
                                    <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 mb-3" />
                                        <div className="w-2/3 h-3 bg-white/30 rounded-full mb-2" />
                                        <div className="w-1/2 h-2 bg-white/20 rounded-full" />
                                    </div>
                                    <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                                        <div className="w-8 h-8 rounded-lg bg-white/20 mb-3" />
                                        <div className="w-3/4 h-3 bg-white/30 rounded-full mb-2" />
                                        <div className="w-1/3 h-2 bg-white/20 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- BENTO GRID FEATURES --- */}
                <section id="features" className="px-6 py-32 bg-white relative">
                    <div className="max-w-6xl mx-auto">
                        <div className="ios-reveal flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
                            <div className="max-w-xl">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                                    Đơn giản hóa <br />
                                    <span className="text-emerald-500">mọi thứ bạn ăn.</span>
                                </h2>
                                <p className="text-black/50 font-medium text-lg leading-relaxed">
                                    Chúng tôi xây dựng CalSnap với triết lý của Apple: Mạnh mẽ ở bên trong, tối giản ở bên ngoài.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <div className="ios-card p-4 rounded-3xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white">
                                        <Star size={20} fill="currentColor" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Hạng mục</p>
                                        <p className="text-sm font-black">Yêu thích nhất</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: AI Scan */}
                            <div className="ios-reveal ios-card md:col-span-2 group delay-100 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <div className="text-[120px] font-black leading-none select-none tracking-tighter">AI</div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
                                    <div className="flex-1 text-left">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:rotate-12 transition-transform">
                                            <Scan size={24} />
                                        </div>
                                        <h3 className="text-2xl font-black mb-4">Snap & Analyse</h3>
                                        <p className="text-black/50 leading-relaxed font-medium mb-6">
                                            Công nghệ nhận diện hình ảnh tiên tiến giúp phân tích chính xác từng thành phần trong đĩa ăn của bạn chỉ với một tấm hình.
                                        </p>
                                        <div className="flex gap-4">
                                            <div className="px-4 py-2 bg-emerald-50 rounded-xl">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase">Độ chính xác</p>
                                                <p className="text-xl font-black text-emerald-700">98.2%</p>
                                            </div>
                                            <div className="px-4 py-2 bg-slate-50 rounded-xl">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Tốc độ xử lý</p>
                                                <p className="text-xl font-black text-slate-700">0.8s</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 w-full bg-emerald-50 rounded-[1.5rem] overflow-hidden p-8 aspect-square flex items-center justify-center relative">
                                        <div className="w-48 h-48 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative">
                                            <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin-slow" />
                                            <Scan size={48} className="text-emerald-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Macros Chart */}
                            <div className="ios-reveal ios-card delay-200">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                                    <Activity size={24} />
                                </div>
                                <h3 className="text-2xl font-black mb-4">Smart Macros</h3>

                                {/* Donut Chart Visual */}
                                <div className="relative w-40 h-40 mx-auto my-8">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100" />
                                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="440" strokeDashoffset="110" className="text-blue-500 stroke-cap-round transition-all duration-1000" />
                                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="440" strokeDashoffset="330" className="text-amber-500 stroke-cap-round" />
                                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="440" strokeDashoffset="400" className="text-orange-500 stroke-cap-round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black tracking-tight">75%</span>
                                        <span className="text-[10px] font-bold text-black/40 uppercase">Mục tiêu</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Protein', color: 'bg-blue-500', pct: '45%' },
                                        { label: 'Carbs', color: 'bg-amber-500', pct: '35%' },
                                        { label: 'Fat', color: 'bg-orange-500', pct: '20%' }
                                    ].map(m => (
                                        <div key={m.label} className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-black uppercase text-black/40">
                                                <span className="flex items-center gap-1.5">
                                                    <div className={cn("w-2 h-2 rounded-full", m.color)} />
                                                    {m.label}
                                                </span>
                                                <span>{m.pct}</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                                                <div className={cn("h-full rounded-full transition-all duration-1000", m.color)} style={{ width: m.pct }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Card 3: 7-Day Consistency */}
                            <div className="ios-reveal ios-card delay-300 md:col-span-2 group overflow-hidden">
                                <div className="flex flex-col md:flex-row gap-10 relative z-10">
                                    <div className="flex-1">
                                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-6">
                                            <Flame size={24} />
                                        </div>
                                        <h3 className="text-2xl font-black mb-4">7-Day Consistency</h3>
                                        <p className="text-black/50 leading-relaxed font-medium mb-8">
                                            Duy trì thói quen là chìa khóa. Biểu đồ thông minh giúp bạn theo dõi sự ổn định trong dinh dưỡng hàng tuần.
                                        </p>
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-3xl font-black tracking-tighter">18d</p>
                                                <p className="text-[10px] font-bold text-black/40 uppercase">Chuỗi hiện tại</p>
                                            </div>
                                            <div className="w-px h-10 bg-black/5" />
                                            <div>
                                                <p className="text-3xl font-black tracking-tighter">2,450</p>
                                                <p className="text-[10px] font-bold text-black/40 uppercase">Avg Calories</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-end justify-between gap-2 h-48 pt-10">
                                        {[65, 85, 45, 95, 75, 55, 90].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
                                                <div className="w-full bg-emerald-500/10 rounded-full relative group cursor-pointer h-full">
                                                    <div
                                                        className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 delay-500 flex items-center justify-center group-hover:brightness-110"
                                                        style={{ height: `${h}%` }}
                                                    >
                                                        <span className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-white transition-opacity -translate-y-6">{h}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-black/30">T{i + 2}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: User Stats */}
                            <div className="ios-reveal ios-card delay-400 bg-white border border-black/5 relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 group-hover:scale-150 transition-transform duration-1000" />
                                <div className="relative z-10">
                                    <h3 className="text-xl font-black mb-6">User Stats</h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-black/50">Meals Scanned</span>
                                            <span className="text-lg font-black tabular-nums">1.2M+</span>
                                        </div>
                                        <div className="w-full h-px bg-black/5" />
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-black/50">Active Users</span>
                                            <span className="text-lg font-black tabular-nums">15.4K</span>
                                        </div>
                                        <div className="w-full h-px bg-black/5" />
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-black/50">KG Lost</span>
                                            <span className="text-lg font-black tabular-nums text-emerald-600">8.2K+</span>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-black/5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white" />)}
                                            </div>
                                            <p className="text-[10px] font-bold text-black/40 tracking-tight">Joined by 20+ today</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 5: Experience */}
                            <div className="ios-reveal ios-card md:col-span-1 bg-gradient-to-br from-emerald-500 to-teal-700 text-white delay-500 border-none relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.2),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <div className="h-full flex flex-col justify-between relative z-10">
                                    <h3 className="text-4xl font-extrabold tracking-tighter italic font-fraunces leading-[0.9]">
                                        Thiết kế <br /> cho cuộc sống <br /> bận rộn.
                                    </h3>
                                    <div className="mt-12 flex items-center justify-between">
                                        <div className="flex -space-x-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-white/20 backdrop-blur-md" />
                                            ))}
                                            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 bg-emerald-800 flex items-center justify-center text-[10px] font-black">
                                                +5k
                                            </div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-colors cursor-pointer">
                                            <ArrowRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- CTA FOOTER --- */}
                <section className="px-6 py-32 bg-[#f5f5f7]">
                    <div className="max-w-4xl mx-auto ios-card p-12 md:p-20 text-center relative overflow-hidden bg-black text-white border-none shadow-[0_40px_100px_rgba(0,0,0,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
                                Sẵn sàng thay đổi <br /> <span className="text-emerald-400">cơ thể bạn?</span>
                            </h2>
                            <p className="text-white/50 text-lg mb-12 max-w-lg mx-auto font-medium leading-relaxed">
                                Gia nhập hàng ngàn người đang sống khỏe mạnh hơn mỗi ngày cùng CalSnap AI.
                            </p>
                            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                                <Link href="/register" className="ios-btn-primary bg-white text-black hover:bg-emerald-50 w-full md:w-auto px-12 py-5 text-lg">
                                    Bắt đầu miễn phí
                                </Link>
                                <Link href="/login" className="text-white/60 hover:text-white font-bold transition-colors">
                                    Đăng nhập
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 text-center">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center text-white">
                                <Flame size={12} fill="currentColor" />
                            </div>
                            <span className="text-sm font-black tracking-tight">CalSnap</span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/30">
                            © 2026 CALSNAP AI NUTRITION. DESIGNED WITH LOVE.
                        </p>
                    </div>
                </section>
            </main>

            {/* --- ADD NEW ANIMATIONS TO CSS --- */}
            <style jsx global>{`
        @keyframes shimmer {
          0% { opacity: 0.2; transform: scaleX(0.5); }
          50% { opacity: 0.5; transform: scaleX(1); }
          100% { opacity: 0.2; transform: scaleX(0.5); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite ease-in-out;
          transform-origin: left;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
        </div>
    )
}
