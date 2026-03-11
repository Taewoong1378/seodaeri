'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface BrokerDistributionDonutProps {
  data: { name: string; value: number }[]
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#ec4899']

export function BrokerDistributionDonut({ data }: BrokerDistributionDonutProps) {
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
            formatter={(value) => [Number(value).toLocaleString('ko-KR') + '개', '보유종목']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
