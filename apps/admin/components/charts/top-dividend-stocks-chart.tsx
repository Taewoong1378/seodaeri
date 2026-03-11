'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface TopDividendStocksChartProps {
  data: { name: string; ticker: string; amount: number }[]
}

export function TopDividendStocksChart({ data }: TopDividendStocksChartProps) {
  return (
    <div className="h-[500px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            fontSize={12}
            width={90}
            tickFormatter={(val: string) => val.length > 12 ? `${val.slice(0, 12)}...` : val}
          />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            formatter={(value) => [`${Number(value).toLocaleString('ko-KR')}원`, '배당금 총액']}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="amount" fill="#f59e0b" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
