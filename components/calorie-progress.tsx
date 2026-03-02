import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface CalorieProgressProps {
    consumed: number
    goal: number
}

export function CalorieProgress({ consumed, goal }: CalorieProgressProps) {
    const percentage = Math.min((consumed / goal) * 100, 100)
    const remaining = goal - consumed
    const isOver = consumed > goal

    return (
        <div className="space-y-3">
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-4xl font-bold tabular-nums">
                        {consumed.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-1 text-sm">kcal eaten</span>
                </div>
                <div className="text-right">
                    <span className={cn(
                        'text-sm font-medium',
                        isOver ? 'text-destructive' : 'text-primary'
                    )}>
                        {isOver
                            ? `+${(consumed - goal).toLocaleString()} over`
                            : `${remaining.toLocaleString()} remaining`}
                    </span>
                    <p className="text-xs text-muted-foreground">of {goal.toLocaleString()} goal</p>
                </div>
            </div>
            <div className="relative">
                <Progress
                    value={percentage}
                    className={cn(
                        'h-3 rounded-full',
                        isOver ? '[&>div]:bg-destructive' : '[&>div]:bg-primary'
                    )}
                />
            </div>
        </div>
    )
}
