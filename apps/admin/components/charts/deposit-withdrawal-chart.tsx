'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface DepositWithdrawalChartProps {
  data: { month: string; deposit: number; withdrawal: number }[]
}

export function DepositWithdrawalChart({ data }: DepositWithdrawalChartProps) {
  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" fontSize={11} />
          <YAxis fontSize={12} />
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            formatter={(value, name) => [
              `${Number(value).toLocaleString('ko-KR')}원`,
              name === 'deposit' ? '입금' : '출금',
            ]}
          />
          <Legend formatter={(value: string) => value === 'deposit' ? '입금' : '출금'} />
          <Bar dataKey="deposit" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="withdrawal" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
