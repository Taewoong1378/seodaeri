'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface TransactionVolumeChartProps {
  data: { week: string; BUY: number; SELL: number; DIVIDEND: number }[]
}

const TYPE_COLORS = {
  BUY: '#3b82f6',
  SELL: '#ef4444',
  DIVIDEND: '#10b981',
}

export function TransactionVolumeChart({ data }: TransactionVolumeChartProps) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" fontSize={11} />
          <YAxis fontSize={12} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = { BUY: '매수', SELL: '매도', DIVIDEND: '배당' }
              return [`${value}건`, labels[name] ?? name]
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = { BUY: '매수', SELL: '매도', DIVIDEND: '배당' }
              return labels[value] ?? value
            }}
          />
          <Bar dataKey="BUY" stackId="a" fill={TYPE_COLORS.BUY} radius={[0, 0, 0, 0]} />
          <Bar dataKey="SELL" stackId="a" fill={TYPE_COLORS.SELL} radius={[0, 0, 0, 0]} />
          <Bar dataKey="DIVIDEND" stackId="a" fill={TYPE_COLORS.DIVIDEND} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
