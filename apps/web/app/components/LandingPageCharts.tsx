'use client';

import type { JSX } from 'react';
import { DividendByYearChart } from '../dashboard/components/DividendByYearChart';
import { MonthlyProfitLossChart } from '../dashboard/components/MonthlyProfitLossChart';

// Mock Data for Dividend Growth (고정값 - Hydration 오류 방지)
const dividendData = {
  years: [2021, 2022, 2023, 2024],
  data: [
    { month: '1', '2021': 15000, '2022': 35000, '2023': 68000, '2024': 110000 },
    { month: '2', '2021': 18000, '2022': 42000, '2023': 75000, '2024': 125000 },
    { month: '3', '2021': 22000, '2022': 48000, '2023': 85000, '2024': 140000 },
    { month: '4', '2021': 28000, '2022': 55000, '2023': 95000, '2024': 155000 },
    { month: '5', '2021': 32000, '2022': 62000, '2023': 105000, '2024': 172000 },
    { month: '6', '2021': 38000, '2022': 70000, '2023': 118000, '2024': 188000 },
    { month: '7', '2021': 42000, '2022': 78000, '2023': 128000, '2024': 205000 },
    { month: '8', '2021': 48000, '2022': 85000, '2023': 140000, '2024': 220000 },
    { month: '9', '2021': 52000, '2022': 92000, '2023': 152000, '2024': 238000 },
    { month: '10', '2021': 58000, '2022': 100000, '2023': 165000, '2024': 255000 },
    { month: '11', '2021': 62000, '2022': 108000, '2023': 178000, '2024': 272000 },
    { month: '12', '2021': 68000, '2022': 115000, '2023': 190000, '2024': 290000 },
  ],
};

// Mock Data for Profit/Loss (고정값 - Hydration 오류 방지)
const profitLossData = [
  { month: '1월', profit: 1250000, loss: 180000 },
  { month: '2월', profit: 980000, loss: 220000 },
  { month: '3월', profit: 1580000, loss: 150000 },
  { month: '4월', profit: 1120000, loss: 280000 },
  { month: '5월', profit: 1850000, loss: 120000 },
  { month: '6월', profit: 1420000, loss: 350000 },
  { month: '7월', profit: 2100000, loss: 180000 },
  { month: '8월', profit: 1680000, loss: 250000 },
  { month: '9월', profit: 1950000, loss: 190000 },
  { month: '10월', profit: 2280000, loss: 140000 },
  { month: '11월', profit: 1780000, loss: 220000 },
  { month: '12월', profit: 2450000, loss: 160000 },
];

export function LandingDividendChart(): JSX.Element {
  return (
    <DividendByYearChart data={dividendData} variant="landing" />
  );
}

export function LandingProfitLossChart(): JSX.Element {
  return (
    <div className="w-full bg-white rounded-xl p-4 shadow-sm">
      <MonthlyProfitLossChart data={profitLossData} variant="landing" />
    </div>
  );
}
