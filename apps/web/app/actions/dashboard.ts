'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import {
  type AccountSummary,
  type AccountTrendData,
  type DividendRecord,
  type MonthlyDividend,
  type MonthlyProfitLoss,
  type PerformanceComparisonData,
  type PortfolioItem,
  aggregateMonthlyDividends,
  fetchSheetData,
  parseAccountSummary,
  parseAccountTrendData,
  parseDividendData,
  parseMonthlyProfitLoss,
  parsePerformanceComparisonData,
  parsePortfolioData,
} from '../../lib/google-sheets';

export interface DashboardData {
  // 계좌 요약 (1. 계좌현황(누적) 탭에서)
  totalAsset: number;
  totalYield: number;
  totalInvested: number;
  totalProfit: number;
  // 배당 데이터 (7. 배당내역 탭에서)
  thisMonthDividend: number;
  yearlyDividend: number;
  monthlyDividends: MonthlyDividend[];
  // 포트폴리오 (3. 종목현황 탭에서)
  portfolio: PortfolioItem[];
  // 수익률 비교 (5. 계좌내역(누적) 탭에서)
  performanceComparison: PerformanceComparisonData[];
  // 계좌 추세 (5. 계좌내역(누적) 탭에서 - 누적입금액 vs 계좌총액)
  accountTrend: AccountTrendData[];
  // 월별 손익 (1. 계좌현황(누적) 탭에서 B49:M50)
  monthlyProfitLoss: MonthlyProfitLoss[];
  // 마지막 동기화 시간
  lastSyncAt: string | null;
}

/**
 * 대시보드 데이터 조회
 * 캐시된 데이터 우선 사용, 없으면 시트에서 직접 읽기
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const supabase = createServiceClient();

  // 사용자 정보 및 spreadsheet_id 조회
  // ID로 먼저 조회, 실패하면 이메일로 fallback
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

  if (!user?.spreadsheet_id || !session.accessToken) {
    // 시트 연동 안됨 - 기본값 반환
    return {
      totalAsset: 0,
      totalYield: 0,
      totalInvested: 0,
      totalProfit: 0,
      thisMonthDividend: 0,
      yearlyDividend: 0,
      monthlyDividends: [],
      portfolio: [],
      performanceComparison: [],
      accountTrend: [],
      monthlyProfitLoss: [],
      lastSyncAt: null,
    };
  }

  try {
    // 시트에서 데이터 읽기 (병렬 처리)
    const [accountRows, dividendRows, portfolioRows, performanceRows, profitLossRows] = await Promise.all([
      fetchSheetData(session.accessToken, user.spreadsheet_id, "'1. 계좌현황(누적)'!A:K").catch((e) => {
        console.error('[Sheet] 1. 계좌현황(누적) 읽기 실패:', e);
        return null;
      }),
      fetchSheetData(session.accessToken, user.spreadsheet_id, "'7. 배당내역'!A:J").catch((e) => {
        console.error('[Sheet] 7. 배당내역 읽기 실패:', e);
        return null;
      }),
      fetchSheetData(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!A:P").catch((e) => {
        console.error('[Sheet] 3. 종목현황 읽기 실패:', e);
        return null;
      }),
      // 수익률 비교 데이터는 "5. 계좌내역(누적)" 시트에 있음
      fetchSheetData(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!G17:AB78").catch((e) => {
        console.error('[Sheet] 5. 계좌내역(누적) 수익률 비교 읽기 실패:', e);
        return null;
      }),
      // 월별 손익 데이터는 "2. 계좌현황(올해)" 시트의 B48:M50
      // B48=연도, B49=월라벨, B50=손익데이터
      fetchSheetData(session.accessToken, user.spreadsheet_id, "'2. 계좌현황(올해)'!B48:M50").catch((e) => {
        console.error('[Sheet] 2. 계좌현황(올해) 월별 손익 읽기 실패:', e);
        return null;
      }),
    ]);

    // 디버깅: 시트에서 가져온 원본 데이터 출력 (데이터가 있는 행만)
    console.log('\n========== 시트 데이터 디버깅 ==========');

    console.log('[Sheet] 1. 계좌현황(누적) 행 수:', accountRows?.length || 0);
    if (accountRows && accountRows.length > 0) {
      console.log('[Sheet] 계좌현황 - 라벨이 있는 행들:');
      accountRows.forEach((row, i) => {
        // 빈 배열이 아닌 행 중에서 주요 라벨 포함 여부 확인
        if (row && row.length > 0 && row.some((cell: any) => cell !== '' && cell !== undefined)) {
          const rowStr = row.join(' | ');
          // 주요 라벨이 포함된 행만 출력
          if (rowStr.includes('총자산') || rowStr.includes('투자원금') ||
              rowStr.includes('수익률') || rowStr.includes('수익금') ||
              rowStr.includes('평가금액') || rowStr.includes('원금')) {
            console.log(`  Row ${i + 1}:`, JSON.stringify(row));
          }
        }
      });
    }

    console.log('\n[Sheet] 7. 배당내역 행 수:', dividendRows?.length || 0);
    if (dividendRows && dividendRows.length > 0) {
      console.log('[Sheet] 배당내역 - 헤더 행:', JSON.stringify(dividendRows[0]));
      console.log('[Sheet] 배당내역 - 데이터가 있는 행들 (첫 15개):');
      let count = 0;
      dividendRows.forEach((row, i) => {
        if (count >= 15) return;
        if (row && row.length > 0 && row.some((cell: any) => cell !== '' && cell !== undefined)) {
          console.log(`  Row ${i + 1} (${row.length} cols):`, JSON.stringify(row));
          count++;
        }
      });
    }

    console.log('\n[Sheet] 3. 종목현황 행 수:', portfolioRows?.length || 0);
    if (portfolioRows && portfolioRows.length > 0) {
      console.log('[Sheet] 종목현황 - 모든 데이터 행 (최대 50개):');
      let count = 0;
      portfolioRows.forEach((row, i) => {
        if (count >= 50) return;
        if (row && row.length > 0 && row.some((cell: any) => cell !== '' && cell !== undefined)) {
          console.log(`  Row ${i + 1} (${row.length} cols):`, JSON.stringify(row));
          count++;
        }
      });
    }
    console.log('==========================================\n');

    // 계좌 요약 파싱
    const accountSummary: AccountSummary = accountRows
      ? parseAccountSummary(accountRows)
      : { totalAsset: 0, totalYield: 0, totalInvested: 0, totalProfit: 0 };

    console.log('[Parsed] 계좌 요약:', accountSummary);

    // 배당 데이터 파싱
    const dividends: DividendRecord[] = dividendRows
      ? parseDividendData(dividendRows)
      : [];

    console.log('[Parsed] 배당 내역 수:', dividends.length);
    if (dividends.length > 0) {
      console.log('[Parsed] 배당 샘플 (첫 3건):', dividends.slice(0, 3));
    }

    const monthlyDividends = aggregateMonthlyDividends(dividends);
    console.log('[Parsed] 월별 배당금:', JSON.stringify(monthlyDividends));

    // 이번 달 배당금 계산
    const now = new Date();
    const thisMonth = `${now.getMonth() + 1}월`;
    const thisYear = now.getFullYear();
    const thisMonthData = monthlyDividends.find(
      (m) => m.month === thisMonth && m.year === thisYear
    );
    const thisMonthDividend = thisMonthData?.amount || 0;

    // 올해 총 배당금 계산
    const yearlyDividend = monthlyDividends
      .filter((m) => m.year === thisYear)
      .reduce((sum, m) => sum + m.amount, 0);

    console.log('[Parsed] 이번달 배당:', thisMonthDividend, '올해 배당:', yearlyDividend);

    // 포트폴리오 파싱
    const portfolio: PortfolioItem[] = portfolioRows
      ? parsePortfolioData(portfolioRows)
      : [];

    console.log('[Parsed] 포트폴리오 종목 수:', portfolio.length);
    if (portfolio.length > 0) {
      console.log('[Parsed] 포트폴리오 샘플 (첫 3종목):', portfolio.slice(0, 3));
    }

    // 포트폴리오에서 총자산 계산 (시트의 평가액 합계)
    let totalAsset = 0;
    let totalInvested = 0;

    for (const item of portfolio) {
      totalAsset += item.totalValue;
      totalInvested += item.avgPrice * item.quantity;
    }

    const totalProfit = totalAsset - totalInvested;
    const totalYield = totalInvested > 0
      ? ((totalAsset - totalInvested) / totalInvested) * 100
      : accountSummary.totalYield; // 시트의 수익률 fallback

    console.log('[Calculated from Portfolio] 총자산:', totalAsset, '투자원금:', totalInvested, '수익금:', totalProfit, '수익률:', `${totalYield.toFixed(2)}%`);

    // 포트폴리오 캐시 업데이트 (백그라운드)
    if (portfolio.length > 0) {
      const upsertData = portfolio.map((item) => ({
        user_id: user.id,
        ticker: item.ticker,
        avg_price: item.avgPrice,
        quantity: item.quantity,
        current_price: item.currentPrice,
        currency: item.currency,
        updated_at: new Date().toISOString(),
      }));

      // 백그라운드에서 캐시 업데이트 (에러 무시)
      (async () => {
        try {
          await supabase
            .from('portfolio_cache')
            .upsert(upsertData, { onConflict: 'user_id,ticker' });
        } catch (err) {
          console.error('Cache update failed:', err);
        }
      })();
    }

    // 수익률 비교 파싱
    const performanceComparison: PerformanceComparisonData[] = performanceRows
      ? parsePerformanceComparisonData(performanceRows)
      : [];

    console.log('[Parsed] 수익률 비교 데이터 수:', performanceComparison.length);

    // 계좌 추세 파싱 (같은 performanceRows에서)
    const accountTrend: AccountTrendData[] = performanceRows
      ? parseAccountTrendData(performanceRows)
      : [];

    console.log('[Parsed] 계좌 추세 데이터 수:', accountTrend.length);

    // 월별 손익 파싱
    console.log('[Sheet] 월별 손익 원본 데이터:', JSON.stringify(profitLossRows));
    const monthlyProfitLoss: MonthlyProfitLoss[] = profitLossRows
      ? parseMonthlyProfitLoss(profitLossRows)
      : [];

    console.log('[Parsed] 월별 손익 데이터 수:', monthlyProfitLoss.length);
    console.log('[Parsed] 월별 손익 데이터:', JSON.stringify(monthlyProfitLoss));

    return {
      totalAsset: Math.round(totalAsset),
      totalYield: Number.parseFloat(totalYield.toFixed(2)),
      totalInvested: Math.round(totalInvested),
      totalProfit: Math.round(totalProfit),
      thisMonthDividend,
      yearlyDividend,
      monthlyDividends,
      portfolio,
      performanceComparison,
      accountTrend,
      monthlyProfitLoss,
      lastSyncAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);

    // 에러 시 캐시된 포트폴리오 데이터 반환
    const { data: cachedPortfolio } = await supabase
      .from('portfolio_cache')
      .select('*')
      .eq('user_id', session.user.id);

    let totalAsset = 0;
    let totalInvested = 0;

    if (cachedPortfolio) {
      for (const item of cachedPortfolio) {
        const rate = item.currency === 'USD' ? 1400 : 1;
        totalAsset += (item.current_price || 0) * (item.quantity || 0) * rate;
        totalInvested += (item.avg_price || 0) * (item.quantity || 0) * rate;
      }
    }

    const totalYield = totalInvested > 0
      ? ((totalAsset - totalInvested) / totalInvested) * 100
      : 0;

    return {
      totalAsset: Math.round(totalAsset),
      totalYield: Number.parseFloat(totalYield.toFixed(2)),
      totalInvested: Math.round(totalInvested),
      totalProfit: Math.round(totalAsset - totalInvested),
      thisMonthDividend: 0,
      yearlyDividend: 0,
      monthlyDividends: [],
      portfolio: [],
      performanceComparison: [],
      accountTrend: [],
      monthlyProfitLoss: [],
      lastSyncAt: null,
    };
  }
}

/**
 * 포트폴리오 데이터 새로고침 (수동 동기화)
 */
export async function syncPortfolio() {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    throw new Error('Unauthorized or missing access token');
  }

  const supabase = createServiceClient();

  // ID로 먼저 조회, 실패하면 이메일로 fallback
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

  if (!user?.spreadsheet_id) {
    throw new Error('Spreadsheet ID not found');
  }

  // 시트에서 포트폴리오 데이터 읽기
  const rows = await fetchSheetData(
    session.accessToken,
    user.spreadsheet_id,
    "'3. 종목현황'!A:J"
  );

  const portfolio = parsePortfolioData(rows || []);

  // 포트폴리오 캐시 업데이트
  if (portfolio.length > 0) {
    const upsertData = portfolio.map((item) => ({
      user_id: user.id,
      ticker: item.ticker,
      avg_price: item.avgPrice,
      quantity: item.quantity,
      current_price: item.currentPrice,
      currency: item.currency,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('portfolio_cache')
      .upsert(upsertData, { onConflict: 'user_id,ticker' });

    if (error) throw error;
  }

  revalidatePath('/dashboard');

  return { success: true, count: portfolio.length };
}
