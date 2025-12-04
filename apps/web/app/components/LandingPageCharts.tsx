'use client';

import { DividendByYearChart } from '../dashboard/components/DividendByYearChart';
import { MonthlyProfitLossChart } from '../dashboard/components/MonthlyProfitLossChart';

// Mock Data for Dividend Growth
const dividendData = {
  years: [2021, 2022, 2023, 2024],
  data: Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month: `${month}`,
      '2021': Math.floor(Math.random() * 50000) + 10000 + (month * 1000),
      '2022': Math.floor(Math.random() * 80000) + 30000 + (month * 2000),
      '2023': Math.floor(Math.random() * 120000) + 60000 + (month * 3000),
      '2024': Math.floor(Math.random() * 150000) + 100000 + (month * 4000),
    };
  }),
};

// Mock Data for Profit/Loss
const profitLossData = Array.from({ length: 12 }, (_, i) => ({
  month: `${i + 1}월`,
  profit: Math.floor(Math.random() * 2000000) + 500000,
  loss: Math.floor(Math.random() * 500000),
}));

export function LandingDividendChart() {
  return (
    <DividendByYearChart data={dividendData} variant="landing" />
  );
}

export function LandingProfitLossChart() {
  return (
    <div className="w-full bg-white rounded-xl p-4 shadow-sm">
      <MonthlyProfitLossChart data={profitLossData} variant="landing" />
    </div>
  );
}
