'use client'

import { Pie, PieChart, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { StatusDistribution } from '@/lib/dashboard'

interface StatusDonutChartProps {
  data: StatusDistribution[]
  valueLabel: string
  emptyMessage: string
}

export function StatusDonutChart({ data, valueLabel, emptyMessage }: StatusDonutChartProps) {
  const config = {
    value: {
      label: valueLabel,
    },
  }

  const hasData = data.some((d) => d.value > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <PieChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={100}
          strokeWidth={2}
          stroke="var(--color-background)"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
