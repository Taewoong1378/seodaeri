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
      <div className="flex items-center gap-1 p-1 bg-muted rounded-full overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-fit px-4 py-2.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
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
