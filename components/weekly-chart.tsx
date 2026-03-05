'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useEffect, useState } from 'react'

interface WeeklyData {
    date: string
    label?: string
    calories: number
}

interface WeeklyChartProps {
    data: WeeklyData[]
    goal?: number
}

export function WeeklyChart({ data, goal = 2000 }: WeeklyChartProps) {
    const [chartConfig, setChartConfig] = useState({ fontSizeX: 12, fontSizeY: 11, marginLeft: -20 })
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 400
            setChartConfig({
                fontSizeX: isMobile ? 10 : 12,
                fontSizeY: isMobile ? 9 : 11,
                marginLeft: isMobile ? -30 : -20
            })
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const check = () => setIsDark(document.documentElement.classList.contains('dark'))
        check()
        const observer = new MutationObserver(check)
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    }, [])

    const barColors = {
        over: '#f87171',        // red-400
        normal: '#34d399',      // emerald-400
        empty: isDark ? '#1e293b' : '#e2e8f0',  // slate-800 dark / slate-200 light
    }
    const axisColor = '#94a3b8'   // slate-400
    const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.3)'
    const tooltipBg = isDark ? '#1e293b' : '#ffffff'
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0'
    const tooltipColor = isDark ? '#f1f5f9' : '#0f172a'

    return (
        <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: chartConfig.marginLeft, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis
                        dataKey="label"
                        tick={{ fill: axisColor, fontSize: chartConfig.fontSizeX }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: axisColor, fontSize: chartConfig.fontSizeY }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: '12px',
                            padding: '8px 12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                        labelStyle={{
                            color: isDark ? '#f8fafc' : '#1e293b',
                            fontWeight: 'bold',
                            marginBottom: '4px'
                        }}
                        itemStyle={{
                            color: isDark ? '#cbd5e1' : '#475569',
                            fontSize: '12px'
                        }}
                        cursor={{ fill: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.15)' }}
                        formatter={(value) => [`${value ?? 0} kcal`, 'Calories']}
                    />
                    <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={
                                    entry.calories >= goal
                                        ? barColors.over
                                        : entry.calories > 0
                                            ? barColors.normal
                                            : barColors.empty
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}