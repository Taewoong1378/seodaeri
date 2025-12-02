'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import {
  type AccountSummary,
  type AccountTrendData,
  type DividendRecord,
  type MonthlyDividend,
  type MonthlyProfitLoss,
  type MonthlyYieldComparisonData,
  type PerformanceComparisonData,
  type PortfolioItem,
  type YieldComparisonData,
  type YieldComparisonDollarData,
  aggregateMonthlyDividends,
  fetchSheetData,
  parseAccountSummary,
  parseAccountTrendData,
  parseDividendData,
  parseMonthlyProfitLoss,
  parseMonthlyYieldComparisonWithDollar,
  parsePerformanceComparisonData,
  parsePortfolioData,
  parseYieldComparisonData,
  parseYieldComparisonDollarData,
} from '../../lib/google-sheets';

// 사용자별 캐시 태그 생성
function getDashboardCacheTag(userId: string) {
  return `dashboard-${userId}`;
}

// 시트 데이터를 캐시하는 함수 (60초 동안 캐시)
async function fetchSheetDataCached(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  userId: string
): Promise<any[] | null> {
  const cachedFetch = unstable_cache(
    async (): Promise<any[] | null> => {
      const result = await fetchSheetData(accessToken, spreadsheetId, range);
      return result ?? null;
    },
    [`sheet-${spreadsheetId}-${range}`],
    {
      revalidate: 60, // 60초 캐시
      tags: [getDashboardCacheTag(userId)],
    }
  );

  try {
    const result = await cachedFetch();
    return (result as any[] | null) ?? null;
  } catch (e) {
    console.error(`[Sheet] ${range} 읽기 실패:`, e);
    return null;
  }
}

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
  // 월별 손익 (5. 계좌내역(누적) 탭 원본 데이터 E:J열)
  monthlyProfitLoss: MonthlyProfitLoss[];
  // 수익률 비교 바 차트 (5. 계좌내역(누적) 탭에서)
  yieldComparison: YieldComparisonData | null;
  // 수익률 비교 달러환율 적용 (4. 수익률 비교(달러환율 적용) 탭에서)
  yieldComparisonDollar: YieldComparisonDollarData | null;
  // 월별 수익률 비교 (이번 달 + 올해 수익률)
  monthlyYieldComparison: MonthlyYieldComparisonData | null;
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
      yieldComparison: null,
      yieldComparisonDollar: null,
      monthlyYieldComparison: null,
      lastSyncAt: null,
    };
  }

  try {
    // 시트에서 데이터 읽기 (병렬 처리, 60초 캐시)
    const [accountRows, dividendRows, portfolioRows, performanceRows, profitLossRows, dollarYieldRows] = await Promise.all([
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'1. 계좌현황(누적)'!A:K", user.id),
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'7. 배당내역'!A:J", user.id),
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!A:P", user.id),
      // 수익률 비교 데이터는 "5. 계좌내역(누적)" 시트에 있음
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!G17:AB78", user.id),
      // 월별 손익 데이터는 "5. 계좌내역(누적)" 시트 원본 입력 데이터 (E:J열)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!E:J", user.id),
      // 수익률 비교(달러환율 적용) 데이터 - "5. 계좌내역(누적)" 시트의 AI~AM 컬럼 (달러환율 적용 지수)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!G17:AQ78", user.id),
    ]);

    // 계좌 요약 파싱
    const accountSummary: AccountSummary = accountRows
      ? parseAccountSummary(accountRows)
      : { totalAsset: 0, totalYield: 0, totalInvested: 0, totalProfit: 0 };

    // 배당 데이터 파싱
    const dividends: DividendRecord[] = dividendRows
      ? parseDividendData(dividendRows)
      : [];

    const monthlyDividends = aggregateMonthlyDividends(dividends);

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

    // 포트폴리오 파싱
    const portfolio: PortfolioItem[] = portfolioRows
      ? parsePortfolioData(portfolioRows)
      : [];

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

    // 계좌 추세 파싱 (같은 performanceRows에서)
    const accountTrend: AccountTrendData[] = performanceRows
      ? parseAccountTrendData(performanceRows)
      : [];

    // 월별 손익 파싱
    const monthlyProfitLoss: MonthlyProfitLoss[] = profitLossRows
      ? parseMonthlyProfitLoss(profitLossRows)
      : [];

    // 수익률 비교 바 차트 데이터 파싱 (같은 performanceRows에서)
    const yieldComparison: YieldComparisonData | null = performanceRows
      ? parseYieldComparisonData(performanceRows)
      : null;

    // 수익률 비교 달러환율 적용 파싱 (확장된 범위에서 달러 컬럼 포함)
    const yieldComparisonDollar: YieldComparisonDollarData | null = dollarYieldRows
      ? parseYieldComparisonDollarData(dollarYieldRows)
      : null;

    // 월별 수익률 비교 파싱 (이번 달 + 올해 수익률, DOLLAR 포함)
    const monthlyYieldComparison: MonthlyYieldComparisonData | null = dollarYieldRows
      ? parseMonthlyYieldComparisonWithDollar(dollarYieldRows)
      : null;

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
      yieldComparison,
      yieldComparisonDollar,
      monthlyYieldComparison,
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
      yieldComparison: null,
      yieldComparisonDollar: null,
      monthlyYieldComparison: null,
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

  // 캐시 무효화
  revalidateTag(getDashboardCacheTag(user.id), 'max');
  revalidatePath('/dashboard');

  return { success: true, count: portfolio.length };
}
