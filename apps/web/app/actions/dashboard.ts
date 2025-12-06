'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath, unstable_cache } from 'next/cache';
import {
  type AccountSummary,
  type AccountTrendData,
  type CumulativeDividendData,
  type DepositRecord,
  type DividendByYearData,
  type DividendRecord,
  type RollingAverageDividendData,
  type YearlyDividendSummaryData,
  type MajorIndexYieldComparisonData,
  type MonthlyDividend,
  type MonthlyProfitLoss,
  type MonthlyYieldComparisonData,
  type MonthlyYieldComparisonDollarAppliedData,
  type PerformanceComparisonData,
  type PortfolioItem,
  type YieldComparisonData,
  type YieldComparisonDollarData,
  aggregateDividendsByYear,
  aggregateMonthlyDividends,
  aggregateYearlyDividends,
  calculateCumulativeDividend,
  calculateRollingAverageDividend,
  fetchSheetData,
  parseAccountSummary,
  parseAccountTrendData,
  parseDepositData,
  parseDividendData,
  parseMajorIndexYieldComparison,
  parseMonthlyProfitLoss,
  parseMonthlyYieldComparisonDollarApplied,
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
  dividendByYear: DividendByYearData | null;
  yearlyDividendSummary: YearlyDividendSummaryData | null;
  rollingAverageDividend: RollingAverageDividendData | null;
  cumulativeDividend: CumulativeDividendData | null;
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
  // 월별 수익률 비교 - 환율 반영 (S&P500, NASDAQ 달러환율 적용)
  monthlyYieldComparisonDollarApplied: MonthlyYieldComparisonDollarAppliedData | null;
  // 주요지수 수익률 비교 라인차트 (5. 계좌내역(누적) 탭에서)
  majorIndexYieldComparison: MajorIndexYieldComparisonData | null;
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

  if (!user?.id || !user?.spreadsheet_id || !session.accessToken) {
    // 시트 연동 안됨 - 기본값 반환
    return {
      totalAsset: 0,
      totalYield: 0,
      totalInvested: 0,
      totalProfit: 0,
      thisMonthDividend: 0,
      yearlyDividend: 0,
      monthlyDividends: [],
      dividendByYear: null,
      yearlyDividendSummary: null,
      rollingAverageDividend: null,
      cumulativeDividend: null,
      portfolio: [],
      performanceComparison: [],
      accountTrend: [],
      monthlyProfitLoss: [],
      yieldComparison: null,
      yieldComparisonDollar: null,
      monthlyYieldComparison: null,
      monthlyYieldComparisonDollarApplied: null,
      majorIndexYieldComparison: null,
      lastSyncAt: null,
    };
  }

  try {
    // 시트에서 데이터 읽기 (병렬 처리, 60초 캐시)
    const [accountRows, dividendRows, portfolioRows, performanceRows, profitLossRows, dollarYieldRows] = await Promise.all([
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'1. 계좌현황(누적)'!A:K", user.id),
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'7. 배당내역'!A:J", user.id),
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!A:P", user.id),
      // 수익률 비교 데이터는 "5. 계좌내역(누적)" 시트에 있음 (행 범위 확장: 78 -> 200)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!G17:AB200", user.id),
      // 월별 손익 데이터는 "5. 계좌내역(누적)" 시트 원본 입력 데이터 (E:J열)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!E:J", user.id),
      // 수익률 비교(달러환율 적용) 데이터 - "5. 계좌내역(누적)" 시트의 AI~AM 컬럼 (달러환율 적용 지수) (행 범위 확장: 78 -> 200)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!G17:AQ200", user.id),
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
    const dividendByYear = aggregateDividendsByYear(dividends);
    const yearlyDividendSummary = aggregateYearlyDividends(dividends);
    const rollingAverageDividend = calculateRollingAverageDividend(dividends);
    const cumulativeDividend = calculateCumulativeDividend(dividends);

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

    // 백그라운드에서 DB 동기화 (에러 무시)
    const userId = user.id as string; // user.id는 위에서 검증됨
    (async () => {
      try {
        const now = new Date().toISOString();
        const today = now.split('T')[0] as string;

        // 1. 포트폴리오 캐시 업데이트
        if (portfolio.length > 0) {
          const portfolioCacheData = portfolio.map((item) => ({
            user_id: userId,
            ticker: item.ticker,
            avg_price: item.avgPrice,
            quantity: item.quantity,
            current_price: item.currentPrice,
            currency: item.currency,
            updated_at: now,
          }));

          await supabase
            .from('portfolio_cache')
            .upsert(portfolioCacheData, { onConflict: 'user_id,ticker' });

          // holdings 테이블도 업데이트
          const holdingsData = portfolio.map((item) => ({
            user_id: userId,
            ticker: item.ticker,
            name: item.name,
            quantity: item.quantity,
            avg_price: item.avgPrice,
            currency: item.currency,
            updated_at: now,
          }));

          await supabase
            .from('holdings')
            .upsert(holdingsData, { onConflict: 'user_id,ticker' });

          // 오늘 스냅샷 저장
          await supabase
            .from('portfolio_snapshots')
            .upsert({
              user_id: userId,
              snapshot_date: today,
              total_asset: Math.round(totalAsset),
              total_invested: Math.round(totalInvested),
              total_profit: Math.round(totalProfit),
              yield_percent: Number(totalYield.toFixed(2)),
            }, { onConflict: 'user_id,snapshot_date' });
        }

        // 2. 배당금 내역 저장
        if (dividends.length > 0) {
          const dividendData = dividends
            .filter((d) => d.date)
            .map((d) => ({
              user_id: userId,
              ticker: d.ticker,
              name: d.name,
              amount_krw: d.amountKRW,
              amount_usd: d.amountUSD,
              dividend_date: d.date,
              sheet_synced: true,
              updated_at: now,
            }));

          if (dividendData.length > 0) {
            await supabase
              .from('dividends')
              .upsert(dividendData, {
                onConflict: 'user_id,ticker,dividend_date,amount_krw,amount_usd',
                ignoreDuplicates: true,
              });
          }
        }
      } catch (err) {
        console.error('[getDashboardData] Background sync failed:', err);
      }
    })();

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

    // 월별 수익률 비교 - 환율 반영 파싱 (S&P500, NASDAQ 달러환율 적용)
    const monthlyYieldComparisonDollarApplied: MonthlyYieldComparisonDollarAppliedData | null = dollarYieldRows
      ? parseMonthlyYieldComparisonDollarApplied(dollarYieldRows)
      : null;

    // 주요지수 수익률 비교 라인차트 파싱
    const majorIndexYieldComparison: MajorIndexYieldComparisonData | null = dollarYieldRows
      ? parseMajorIndexYieldComparison(dollarYieldRows)
      : null;

    return {
      totalAsset: Math.round(totalAsset),
      totalYield: Number.parseFloat(totalYield.toFixed(2)),
      totalInvested: Math.round(totalInvested),
      totalProfit: Math.round(totalProfit),
      thisMonthDividend,
      yearlyDividend,
      monthlyDividends,
      dividendByYear,
      yearlyDividendSummary,
      rollingAverageDividend,
      cumulativeDividend,
      portfolio,
      performanceComparison,
      accountTrend,
      monthlyProfitLoss,
      yieldComparison,
      yieldComparisonDollar,
      monthlyYieldComparison,
      monthlyYieldComparisonDollarApplied,
      majorIndexYieldComparison,
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
      dividendByYear: null,
      yearlyDividendSummary: null,
      rollingAverageDividend: null,
      cumulativeDividend: null,
      portfolio: [],
      performanceComparison: [],
      accountTrend: [],
      monthlyProfitLoss: [],
      yieldComparison: null,
      yieldComparisonDollar: null,
      monthlyYieldComparison: null,
      monthlyYieldComparisonDollarApplied: null,
      majorIndexYieldComparison: null,
      lastSyncAt: null,
    };
  }
}

/**
 * 전체 데이터 동기화 (Sheet → Supabase DB)
 * - 포트폴리오
 * - 배당금 내역
 * - 입출금 내역
 * - 일별 스냅샷
 * - 보유 종목
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

  if (!user?.id || !user?.spreadsheet_id) {
    throw new Error('User or Spreadsheet ID not found');
  }

  const userId = user.id as string;
  const spreadsheetId = user.spreadsheet_id as string;
  const accessToken = session.accessToken;

  // 시트에서 모든 데이터 병렬로 읽기
  const [portfolioRows, dividendRows, depositRows] = await Promise.all([
    fetchSheetData(accessToken, spreadsheetId, "'3. 종목현황'!A:P"),
    fetchSheetData(accessToken, spreadsheetId, "'7. 배당내역'!A:J"),
    fetchSheetData(accessToken, spreadsheetId, "'6. 입금내역'!A:J"), // A:F -> A:J로 확장 (금액 컬럼 포함)
  ]);

  // 1. 포트폴리오 파싱 및 저장
  const portfolio = parsePortfolioData(portfolioRows || []);
  let portfolioCount = 0;
  let holdingsCount = 0;

  if (portfolio.length > 0) {
    // portfolio_cache 업데이트
    const cacheData = portfolio.map((item) => ({
      user_id: userId,
      ticker: item.ticker,
      avg_price: item.avgPrice,
      quantity: item.quantity,
      current_price: item.currentPrice,
      currency: item.currency,
      updated_at: new Date().toISOString(),
    }));

    await supabase
      .from('portfolio_cache')
      .upsert(cacheData, { onConflict: 'user_id,ticker' });

    // holdings 테이블 업데이트
    const holdingsData = portfolio.map((item) => ({
      user_id: userId,
      ticker: item.ticker,
      name: item.name,
      quantity: item.quantity,
      avg_price: item.avgPrice,
      currency: item.currency,
      updated_at: new Date().toISOString(),
    }));

    await supabase
      .from('holdings')
      .upsert(holdingsData, { onConflict: 'user_id,ticker' });

    portfolioCount = portfolio.length;
    holdingsCount = portfolio.length;
  }

  // 2. 배당금 내역 파싱 및 저장
  const dividends = parseDividendData(dividendRows || []);
  let dividendCount = 0;

  if (dividends.length > 0) {
    const dividendData = dividends
      .filter((d) => d.date) // 날짜가 있는 것만
      .map((d) => ({
        user_id: userId,
        ticker: d.ticker,
        name: d.name,
        amount_krw: d.amountKRW,
        amount_usd: d.amountUSD,
        dividend_date: d.date,
        sheet_synced: true,
        updated_at: new Date().toISOString(),
      }));

    if (dividendData.length > 0) {
      // 중복 방지를 위해 upsert 사용
      const { error } = await supabase
        .from('dividends')
        .upsert(dividendData, {
          onConflict: 'user_id,ticker,dividend_date,amount_krw,amount_usd',
          ignoreDuplicates: true,
        });

      if (!error) {
        dividendCount = dividendData.length;
      }
    }
  }

  // 3. 입출금 내역 파싱 및 저장
  const deposits = parseDepositData(depositRows || []);
  let depositCount = 0;

  if (deposits.length > 0) {
    const depositData = deposits
      .filter((d) => d.date && d.amount) // 날짜와 금액이 있는 것만
      .map((d) => ({
        user_id: userId,
        type: d.type,
        amount: d.amount,
        currency: 'KRW' as const,
        deposit_date: d.date,
        memo: d.memo || null,
        sheet_synced: true,
        updated_at: new Date().toISOString(),
      }));

    if (depositData.length > 0) {
      const { error } = await supabase
        .from('deposits')
        .upsert(depositData, {
          onConflict: 'user_id,type,amount,deposit_date',
          ignoreDuplicates: true,
        });

      if (!error) {
        depositCount = depositData.length;
      }
    }
  }

  // 4. 오늘 포트폴리오 스냅샷 저장
  let snapshotSaved = false;
  if (portfolio.length > 0) {
    let totalAsset = 0;
    let totalInvested = 0;

    for (const item of portfolio) {
      const rate = item.currency === 'USD' ? 1400 : 1;
      totalAsset += item.totalValue * rate;
      totalInvested += item.avgPrice * item.quantity * rate;
    }

    const totalProfit = totalAsset - totalInvested;
    const yieldPercent = totalInvested > 0
      ? ((totalAsset - totalInvested) / totalInvested) * 100
      : 0;

    const today = new Date().toISOString().split('T')[0] as string;

    const { error } = await supabase
      .from('portfolio_snapshots')
      .upsert({
        user_id: userId,
        snapshot_date: today,
        total_asset: Math.round(totalAsset),
        total_invested: Math.round(totalInvested),
        total_profit: Math.round(totalProfit),
        yield_percent: Number(yieldPercent.toFixed(2)),
      }, { onConflict: 'user_id,snapshot_date' });

    if (!error) {
      snapshotSaved = true;
    }
  }

  // 캐시 무효화
  revalidatePath('/dashboard');

  console.log(`[syncPortfolio] Synced for user ${userId}:`, {
    portfolioCount,
    holdingsCount,
    dividendCount,
    depositCount,
    snapshotSaved,
  });

  return {
    success: true,
    synced: {
      portfolio: portfolioCount,
      holdings: holdingsCount,
      dividends: dividendCount,
      deposits: depositCount,
      snapshot: snapshotSaved,
    },
  };
}
