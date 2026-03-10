'use client'

import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface AssetGrowthChartProps {
  data: { date: string; totalAsset: number; totalProfit: number }[]
}

export function AssetGrowthChart({ data }: AssetGrowthChartProps) {
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
            formatter={(value: number, name: string) => [
              `${value.toLocaleString('ko-KR')}원`,
              name === 'totalAsset' ? '평균 총자산' : '평균 수익',
            ]}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="totalAsset"
            fill="#3b82f6"
            fillOpacity={0.1}
            stroke="#3b82f6"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="totalProfit"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
