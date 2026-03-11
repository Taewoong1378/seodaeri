'use client'

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface BalanceTrendChartProps {
  data: { month: string; balance: number }[]
}

export function BalanceTrendChart({ data }: BalanceTrendChartProps) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" fontSize={11} />
          <YAxis fontSize={12} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            formatter={(value) => [`${Number(value).toLocaleString('ko-KR')}원`, '총 잔고']}
          />
          <Area
            type="monotone"
            dataKey="balance"
            fill="#3b82f6"
            fillOpacity={0.15}
            stroke="#3b82f6"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
