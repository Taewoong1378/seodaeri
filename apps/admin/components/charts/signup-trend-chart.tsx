'use client'

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Bar } from 'recharts'

interface SignupTrendChartProps {
  data: { date: string; daily: number; cumulative: number }[]
}

export function SignupTrendChart({ data }: SignupTrendChartProps) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis yAxisId="left" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" fontSize={12} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            formatter={(value, name) => [
              `${Number(value)}명`,
              name === 'daily' ? '일별 가입' : '누적 가입',
            ]}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulative"
            fill="#3b82f6"
            fillOpacity={0.1}
            stroke="#3b82f6"
            strokeWidth={2}
          />
          <Bar yAxisId="left" dataKey="daily" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
