'use client';

import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

interface PortfolioItem {
  ticker: string;
  name: string;
  totalValue: number;
  weight: number;
}

interface PortfolioTreemapProps {
  data: PortfolioItem[];
}

const COLORS = [
  '#3b82f6', // blue-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
];

const CustomContent = (props: any) => {
  const { root, depth, x, y, width, height, index, name, weight, value } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: '#ffffff',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {width > 50 && height > 30 && (
        <foreignObject x={x} y={y} width={width} height={height}>
          <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden">
            <span className="text-white font-bold text-xs truncate w-full px-1 drop-shadow-md">
              {name}
            </span>
            {height > 50 && typeof weight === 'number' && (
              <span className="text-white/90 text-[10px] font-medium drop-shadow-md">
                {Math.round(weight)}%
              </span>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-xl z-50">
        <p className="text-popover-foreground text-sm font-bold mb-0.5">{data.name}</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{data.ticker}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-emerald-600 font-medium">{Math.round(data.weight)}%</span>
        </div>
        <p className="text-popover-foreground text-xs mt-1 font-medium">
          {Math.round(data.totalValue).toLocaleString()}원
        </p>
      </div>
    );
  }
  return null;
};

export function PortfolioTreemap({ data }: PortfolioTreemapProps) {
  // 데이터 가공: weight가 0보다 큰 항목만 필터링하고 정렬
  const chartData = data
    .filter(item => item.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map(item => ({
      ...item,
      size: item.totalValue, // Treemap은 size 속성을 사용
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden bg-card border border-border">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={chartData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#fff"
          content={<CustomContent />}
          animationDuration={1000}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
