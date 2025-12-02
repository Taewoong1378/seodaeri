'use client';

import { useState } from 'react';
import { useTransactions } from '../../../hooks';
import { DividendInputModal } from '../../dashboard/components/DividendInputModal';
import { DepositInputModal } from '../../dashboard/components/DepositInputModal';
import { TradeInputModal } from '../../dashboard/components/TradeInputModal';
import { TransactionsClient, type TabType } from './TransactionsClient';

function TransactionsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tab Skeleton */}
      <div className="h-10 bg-white/5 rounded-lg" />
      {/* List Skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 bg-white/5 rounded-lg" />
      ))}
    </div>
  );
}

export function TransactionsWrapper() {
  const [activeTab, setActiveTab] = useState<TabType>('trade');
  const { data, isLoading, error } = useTransactions();

  if (isLoading) {
    return <TransactionsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-sm text-red-400">{data.error}</p>
      </div>
    );
  }

  return (
    <>
      <TransactionsClient
        transactions={data?.transactions || []}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab-specific modals with color-coded floating buttons */}
      {activeTab === 'trade' && <TradeInputModal />}
      {activeTab === 'dividend' && <DividendInputModal />}
      {activeTab === 'deposit' && <DepositInputModal />}
    </>
  );
}
