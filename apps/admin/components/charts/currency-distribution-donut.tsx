'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface CurrencyDistributionDonutProps {
  data: { name: string; value: number }[]
}

const COLORS = ['#3b82f6', '#10b981']

export function CurrencyDistributionDonut({ data }: CurrencyDistributionDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} ${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%`}
            labelLine={true}
            fontSize={12}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
            formatter={(value: number) => [value.toLocaleString('ko-KR'), '금액']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
