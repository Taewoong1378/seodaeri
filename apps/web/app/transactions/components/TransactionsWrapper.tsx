'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTransactions, useAccountBalances } from '../../../hooks';
import { DividendInputModal } from '../../dashboard/components/DividendInputModal';
import { DepositInputModal } from '../../dashboard/components/DepositInputModal';
import { TransactionsClient, type TabType } from './TransactionsClient';
import { AccountBalanceInputModal } from './AccountBalanceInputModal';

function TransactionsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Tab Skeleton */}
      <div className="h-10 bg-muted rounded-lg" />
      {/* List Skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-20 bg-muted rounded-lg" />
      ))}
    </div>
  );
}

export function TransactionsWrapper() {
  const [activeTab, setActiveTab] = useState<TabType>('balance');
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data, isLoading, error } = useTransactions();
  const { data: accountBalances, isLoading: isBalanceLoading } = useAccountBalances();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading || isBalanceLoading) {
    return <TransactionsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  return (
    <>
      <TransactionsClient
        transactions={data?.transactions || []}
        accountBalances={accountBalances || []}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab-specific modals with color-coded floating buttons */}
      {activeTab === 'balance' && (
        <>
          {mounted && createPortal(
            <div className="fixed bottom-24 left-0 right-0 z-50 max-w-[500px] mx-auto pointer-events-none">
              <button
                type="button"
                onClick={() => setIsBalanceModalOpen(true)}
                className="h-14 w-14 rounded-full shadow-xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 active:bg-emerald-800 text-white flex items-center justify-center transition-all absolute right-5 bottom-0 pointer-events-auto"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>,
            document.body
          )}
          <AccountBalanceInputModal
            isOpen={isBalanceModalOpen}
            onClose={() => setIsBalanceModalOpen(false)}
          />
        </>
      )}
      {activeTab === 'dividend' && <DividendInputModal />}
      {activeTab === 'deposit' && <DepositInputModal />}
    </>
  );
}
