'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';

export interface Transaction {
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
}

export interface TransactionsResult {
  success: boolean;
  transactions?: Transaction[];
  error?: string;
}

/**
 * 사용자의 거래내역 조회
 */
export async function getTransactions(): Promise<TransactionsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch transactions:', error);
      return { success: false, error: '거래내역을 불러오는데 실패했습니다.' };
    }

    return {
      success: true,
      transactions: transactions as Transaction[],
    };
  } catch (error) {
    console.error('getTransactions error:', error);
    return { success: false, error: '거래내역 조회 중 오류가 발생했습니다.' };
  }
}
