'use client';

import { useState } from 'react';

interface DashboardTabsProps {
  children: {
    cumulative: React.ReactNode;  // 계좌현황(누적)
    yearly: React.ReactNode;       // 계좌현황(올해)
    dividend: React.ReactNode;     // 배당현황
  };
}

const TABS = [
  { id: 'cumulative', label: '계좌현황(누적)' },
  { id: 'yearly', label: '계좌현황(올해)' },
  { id: 'dividend', label: '배당현황' },
] as const;

type TabId = typeof TABS[number]['id'];

export function DashboardTabs({ children }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('cumulative');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-fit px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'cumulative' && children.cumulative}
        {activeTab === 'yearly' && children.yearly}
        {activeTab === 'dividend' && children.dividend}
      </div>
    </div>
  );
}
