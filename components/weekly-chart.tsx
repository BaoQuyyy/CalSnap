'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WeeklyData {
    date: string
    calories: number
}

interface WeeklyChartProps {
    data: WeeklyData[]
    goal?: number
}

export function WeeklyChart({ data, goal = 2000 }: WeeklyChartProps) {
    return (
        <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/40%)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '13px',
                        }}
                        cursor={{ fill: 'hsl(var(--accent)/30%)' }}
                        formatter={(value) => [`${value ?? 0} kcal`, 'Calories']}
                    />
                    <Bar dataKey="calories" radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.calories >= goal
                                    ? 'hsl(var(--destructive))'
                                    : entry.calories > 0
                                        ? 'hsl(var(--primary))'
                                        : 'hsl(var(--muted))'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
