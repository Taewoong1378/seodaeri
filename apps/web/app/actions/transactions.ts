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
  account?: string; // 계좌(증권사) 정보 (입출금 전용)
  amountKRW?: number; // 배당 전용: 원화 배당금
  amountUSD?: number; // 배당 전용: 외화 배당금
}

export interface TransactionsResult {
  success: boolean;
  transactions?: Transaction[];
  isStandalone?: boolean;
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

  // 데모 모드인 경우 데모 거래내역 반환 (Play Store 심사용)
  if (session.isDemo) {
    const { DEMO_DIVIDEND_TRANSACTIONS, DEMO_DEPOSITS } = await import('../../lib/demo-data');

    // 배당 거래내역을 Transaction 형식으로 변환
    const dividendTransactions: Transaction[] = DEMO_DIVIDEND_TRANSACTIONS.map((d, idx) => ({
      id: `demo-dividend-${idx}`,
      ticker: d.ticker,
      name: d.name,
      type: 'DIVIDEND' as const,
      price: d.amountKRW,
      quantity: 1,
      total_amount: d.amountKRW,
      trade_date: d.date,
      sheet_synced: false,
      created_at: d.date,
      source: 'sheet' as const,
      amountKRW: d.amountKRW,
      amountUSD: d.amountUSD,
    }));

    // 입출금 거래내역을 Transaction 형식으로 변환
    const depositTransactions: Transaction[] = DEMO_DEPOSITS.map((d, idx) => ({
      id: `demo-deposit-${idx}`,
      ticker: '',
      name: d.memo,
      type: d.type as 'DEPOSIT' | 'WITHDRAW',
      price: d.amount,
      quantity: 1,
      total_amount: d.amount,
      trade_date: d.date,
      sheet_synced: false,
      created_at: d.date,
      source: 'sheet' as const,
      account: d.account,
    }));

    // 날짜 기준 정렬하여 반환
    const allTransactions = [...dividendTransactions, ...depositTransactions]
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());

    return { success: true, transactions: allTransactions };
  }

  const supabase = createServiceClient();

  try {
    // 1. 사용자 정보 조회 (ID 또는 이메일)
    let { data: user } = await supabase
      .from('users')
      .select('id, spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, spreadsheet_id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    // Standalone 모드 여부 판별
    const isStandalone = !user.spreadsheet_id;

    // 2. Supabase에서 앱으로 기록한 거래내역 조회
    const { data: dbTransactions, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Failed to fetch transactions from DB:', dbError);
    }

    const appTransactions: Transaction[] = (dbTransactions || []).map((tx) => ({
      ...tx,
      ticker: tx.ticker || '',
      trade_date: tx.trade_date || new Date().toISOString(),
      created_at: tx.created_at || new Date().toISOString(),
      price: tx.price ?? 0,
      quantity: tx.quantity ?? 0,
      total_amount: tx.total_amount ?? 0,
      source: 'app' as const,
    }));

    // 3. 추가 데이터 소스 (Standalone: DB / Sheet 모드: Google Sheets)

    const additionalTransactions: Transaction[] = [];

    // Standalone 모드: DB에서 배당내역과 입출금내역 조회
    if (!user?.spreadsheet_id) {
      console.log('[Transactions] Standalone mode - fetching from DB');

      // 배당내역 조회
      const { data: dbDividends, error: dividendError } = await supabase
        .from('dividends')
        .select('*')
        .eq('user_id', user.id)
        .order('dividend_date', { ascending: false });

      if (dividendError) {
        console.error('[Transactions] Failed to fetch dividends from DB:', dividendError);
      } else if (dbDividends) {
        console.log('[Transactions] DB dividends count:', dbDividends.length);
        const dividendTransactions: Transaction[] = dbDividends.map((d, index) => {
          // 환율 기본값 사용 (standalone 모드에서는 실시간 환율 없음)
          const estimatedRate = 1450; // USD/KRW 기본 환율
          const totalKRW = (d.amount_krw || 0) + (d.amount_usd || 0) * estimatedRate;

          return {
            id: d.id || `db-dividend-${d.dividend_date}-${index}`,
            ticker: d.ticker || '',
            name: d.name || d.ticker || '',
            type: 'DIVIDEND' as const,
            price: totalKRW,
            quantity: 1,
            total_amount: totalKRW,
            trade_date: d.dividend_date,
            sheet_synced: d.sheet_synced || false,
            created_at: d.created_at || d.dividend_date,
            source: 'app' as const,
            amountKRW: d.amount_krw || 0,
            amountUSD: d.amount_usd || 0,
          };
        });
        additionalTransactions.push(...dividendTransactions);
      }

      // 입출금내역 조회
      const { data: dbDeposits, error: depositError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('deposit_date', { ascending: false });

      if (depositError) {
        console.error('[Transactions] Failed to fetch deposits from DB:', depositError);
      } else if (dbDeposits) {
        console.log('[Transactions] DB deposits count:', dbDeposits.length);
        const depositTransactions: Transaction[] = dbDeposits.map((d, index) => ({
          id: d.id || `db-deposit-${d.deposit_date}-${index}`,
          ticker: '',
          name: d.memo || null,
          type: d.type as 'DEPOSIT' | 'WITHDRAW',
          price: d.amount || 0,
          quantity: 1,
          total_amount: d.amount || 0,
          trade_date: d.deposit_date,
          sheet_synced: d.sheet_synced || false,
          created_at: d.created_at || d.deposit_date,
          source: 'app' as const,
          account: undefined, // standalone 모드에서는 계좌 정보 없음 (deposits 테이블에 account 컬럼 없음)
        }));
        additionalTransactions.push(...depositTransactions);
      }
    }
    // Sheet 모드: Google Sheets에서 입금내역, 배당내역 조회
    else if (user?.spreadsheet_id && session.accessToken) {
      try {
        // 입금내역과 배당내역 병렬 조회
        const [depositRows, dividendRows] = await Promise.all([
          fetchSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'6. 입금내역'!A:H"
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
              account: d.account, // 계좌(증권사) 정보
            })
          );
          additionalTransactions.push(...depositTransactions);
        }

        // 배당내역 파싱
        if (dividendRows) {
          console.log('[Sheet] 배당내역 행 수:', dividendRows.length);
          const dividends = parseDividendData(dividendRows);
          const dividendTransactions: Transaction[] = dividends.map(
            (d: DividendRecord, index: number) => {
              // 시트에서 계산된 totalKRW 사용 (실시간 환율 적용됨)
              return {
                id: `dividend-${d.date}-${d.ticker}-${index}`,
                ticker: d.ticker,
                name: d.name || d.ticker,
                type: 'DIVIDEND' as const,
                price: d.totalKRW,
                quantity: 1,
                total_amount: d.totalKRW,
                trade_date: d.date,
                sheet_synced: true,
                created_at: d.date,
                source: 'sheet' as const,
                amountKRW: d.amountKRW, // 원화 배당금 (삭제 시 사용)
                amountUSD: d.amountUSD, // 외화 배당금 (삭제 시 사용)
              };
            }
          );
          additionalTransactions.push(...dividendTransactions);
        }
      } catch (sheetError) {
        console.error('Failed to fetch from sheets:', sheetError);
      }
    }

    // 4. 모든 거래내역 합치고 날짜순 정렬
    const allTransactions = [...appTransactions, ...additionalTransactions].sort(
      (a, b) => {
        const dateCompare =
          new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    );

    console.log('[Transactions] Total:', allTransactions.length, '(App:', appTransactions.length, ', Additional:', additionalTransactions.length, '), isStandalone:', isStandalone);

    return {
      success: true,
      transactions: allTransactions,
      isStandalone,
    };
  } catch (error) {
    console.error('getTransactions error:', error);
    return { success: false, error: '거래내역 조회 중 오류가 발생했습니다.' };
  }
}
