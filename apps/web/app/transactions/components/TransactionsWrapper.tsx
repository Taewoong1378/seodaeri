'use client';

import { useState } from 'react';
import { DividendInputModal } from '../../dashboard/components/DividendInputModal';
import { DepositInputModal } from '../../dashboard/components/DepositInputModal';
import { TradeInputModal } from '../../dashboard/components/TradeInputModal';
import { TransactionsClient, type TabType } from './TransactionsClient';

interface Transaction {
  id: string;
  ticker: string;
  name: string | null;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW';
  price: number;
  quantity: number;
  total_amount: number;
  trade_date: string;
  sheet_synced: boolean;
  created_at: string;
  source: 'app' | 'sheet';
}

interface TransactionsWrapperProps {
  transactions: Transaction[];
}

export function TransactionsWrapper({ transactions }: TransactionsWrapperProps) {
  const [activeTab, setActiveTab] = useState<TabType>('trade');

  return (
    <>
      <TransactionsClient
        transactions={transactions}
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
