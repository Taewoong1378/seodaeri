'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import {
  type DepositRecord,
  type DividendRecord,
  fetchSheetData,
  parseDepositData,
  parseDividendData,
} from '../../lib/google-sheets';

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
  source: 'app' | 'sheet';
}

export interface TransactionsResult {
  success: boolean;
  transactions?: Transaction[];
  error?: string;
}

/**
 * 사용자의 거래내역 조회 (Supabase + Google Sheets)
 */
export async function getTransactions(): Promise<TransactionsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 1. Supabase에서 앱으로 기록한 거래내역 조회
    const { data: dbTransactions, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Failed to fetch transactions from DB:', dbError);
    }

    const appTransactions: Transaction[] = (dbTransactions || []).map((tx) => ({
      ...tx,
      source: 'app' as const,
    }));

    // 2. Google Sheets에서 입금내역, 배당내역 조회
    const { data: user } = await supabase
      .from('users')
      .select('spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    let sheetTransactions: Transaction[] = [];

    if (user?.spreadsheet_id && session.accessToken) {
      try {
        // 입금내역과 배당내역 병렬 조회
        const [depositRows, dividendRows] = await Promise.all([
          fetchSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'6. 입금내역'!A:F"
          ).catch((e) => {
            console.error('[Sheet] 6. 입금내역 읽기 실패:', e);
            return null;
          }),
          fetchSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'7. 배당내역'!A:J"
          ).catch((e) => {
            console.error('[Sheet] 7. 배당내역 읽기 실패:', e);
            return null;
          }),
        ]);

        // 입금내역 파싱
        if (depositRows) {
          console.log('[Sheet] 입금내역 행 수:', depositRows.length);
          const deposits = parseDepositData(depositRows);
          const depositTransactions: Transaction[] = deposits.map(
            (d: DepositRecord, index: number) => ({
              id: `deposit-${d.date}-${index}`,
              ticker: '',
              name: d.memo || (d.type === 'DEPOSIT' ? '입금' : '출금'),
              type: d.type,
              price: d.amount,
              quantity: 1,
              total_amount: d.amount,
              trade_date: d.date,
              sheet_synced: true,
              created_at: d.date,
              source: 'sheet' as const,
            })
          );
          sheetTransactions.push(...depositTransactions);
        }

        // 배당내역 파싱
        if (dividendRows) {
          console.log('[Sheet] 배당내역 행 수:', dividendRows.length);
          const dividends = parseDividendData(dividendRows);
          const exchangeRate = 1400;
          const dividendTransactions: Transaction[] = dividends.map(
            (d: DividendRecord, index: number) => {
              const amountKRW = d.amountKRW + d.amountUSD * exchangeRate;
              return {
                id: `dividend-${d.date}-${d.ticker}-${index}`,
                ticker: d.ticker,
                name: d.name || d.ticker,
                type: 'DIVIDEND' as const,
                price: amountKRW,
                quantity: 1,
                total_amount: amountKRW,
                trade_date: d.date,
                sheet_synced: true,
                created_at: d.date,
                source: 'sheet' as const,
              };
            }
          );
          sheetTransactions.push(...dividendTransactions);
        }
      } catch (sheetError) {
        console.error('Failed to fetch from sheets:', sheetError);
      }
    }

    // 3. 모든 거래내역 합치고 날짜순 정렬
    const allTransactions = [...appTransactions, ...sheetTransactions].sort(
      (a, b) => {
        const dateCompare =
          new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    );

    console.log('[Transactions] Total:', allTransactions.length, '(App:', appTransactions.length, ', Sheet:', sheetTransactions.length, ')');

    return {
      success: true,
      transactions: allTransactions,
    };
  } catch (error) {
    console.error('getTransactions error:', error);
    return { success: false, error: '거래내역 조회 중 오류가 발생했습니다.' };
  }
}
