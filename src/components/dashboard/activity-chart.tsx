'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { ActivityDataPoint } from '@/lib/dashboard'

interface ActivityChartProps {
  data: ActivityDataPoint[]
  createdLabel: string
  completedLabel: string
  emptyMessage: string
}

export function ActivityChart({ data, createdLabel, completedLabel, emptyMessage }: ActivityChartProps) {
  const config = {
    created: {
      label: createdLabel,
      color: 'var(--color-chart-1)',
    },
    completed: {
      label: completedLabel,
      color: 'var(--color-chart-3)',
    },
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(val: string) => {
            const d = new Date(val + 'T00:00:00')
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          }}
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          allowDecimals={false}
          fontSize={11}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Area
          type="monotone"
          dataKey="created"
          stroke="var(--color-chart-1)"
          fill="url(#fillCreated)"
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="completed"
          stroke="var(--color-chart-3)"
          fill="url(#fillCompleted)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
