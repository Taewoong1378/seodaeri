'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath, unstable_cache } from 'next/cache';
import {
  type AccountSummary,
  type AccountTrendData,
  type CumulativeDividendData,
  type DepositRecord,
  type DividendAccountData,
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
  computeDividendAccountData,
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
import { StandaloneDataProvider } from '../../lib/data-provider';
import { getUSDKRWRate } from '../../lib/exchange-rate-api';
import { getHistoricalExchangeRates, getHistoricalMarketData } from '../../lib/historical-exchange-rate';
import { enrichRowsWithExchangeRates, calculateMarketYields } from '../../lib/exchange-rate-enrichment';
import { ALTERNATIVE_ASSET_CODES, getAlternativeAssetPrices } from '../../lib/alternative-asset-api';

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
  // 이번달 수익률 (5번 시트 K열에서 직접 읽음)
  thisMonthYield?: number;
  // 올해 수익률 (연초잔액 대비 계산)
  thisYearYield?: number;
  // 올해 총 입금액 (연간 입금액 목표 달성률 계산용)
  thisYearDeposit?: number;
  // 투자 일수 (6. 입금내역 탭의 L4 셀)
  investmentDays: number;
  // 마지막 동기화 시간
  lastSyncAt: string | null;
  // 계좌 유형별 배당 데이터
  dividendByAccount?: {
    general: DividendAccountData;   // 일반 계좌
    taxSaving: DividendAccountData; // 절세 계좌
  };
}

/**
 * 대시보드 데이터 조회
 * 캐시된 데이터 우선 사용, 없으면 시트에서 직접 읽기
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // 데모 모드인 경우 데모 데이터 반환 (Play Store 심사용)
  if (session.isDemo) {
    const { DEMO_DASHBOARD_DATA } = await import('../../lib/demo-data');
    return DEMO_DASHBOARD_DATA;
  }

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

  if (!user?.id) {
    // 사용자 없음 - 기본값 반환
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
      investmentDays: 0,
      lastSyncAt: null,
    };
  }

  // Standalone 모드: 스프레드시트 없이 DB + API 사용
  if (!user.spreadsheet_id) {
    console.log('[getDashboardData] Standalone mode for user:', user.id);
    return getStandaloneDashboardData(user.id);
  }

  // Sheet 모드: accessToken 필요
  if (!session.accessToken) {
    console.log('[getDashboardData] No access token for sheet mode');
    return getStandaloneDashboardData(user.id); // fallback to standalone
  }

  try {
    // 시트에서 데이터 읽기 (병렬 처리, 60초 캐시)
    const [accountRows, dividendRows, portfolioRows, performanceRows, profitLossRows, depositDateRows, accountHistoryRows, historicalRates, marketData, yieldCell] = await Promise.all([
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'1. 계좌현황(누적)'!A:K", user.id),
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'7. 배당내역'!A:K", user.id),
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'3. 종목현황'!A:P", user.id),
      // 수익률 비교 데이터는 "5. 계좌내역(누적)" 시트에 있음 (행 범위 확장: 78 -> 200)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!G17:AB200", user.id),
      // 월별 손익 데이터는 "5. 계좌내역(누적)" 시트 원본 입력 데이터 (E:J열)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!E:J", user.id),
      // 투자 일수 계산용 - 6. 입금내역의 B열 (날짜)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'6. 입금내역'!B:B", user.id),
      // 총자산/원금/수익률 계산용 - 5. 계좌내역(누적)의 E:Y열
      // E=연도, F=월, H=계좌총액, I=입금액, K=월수익률, Y=누적수익률
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'5. 계좌내역(누적)'!E:Y", user.id),
      // 과거 월별 환율 데이터 (공개 스프레드시트)
      getHistoricalExchangeRates(),
      // 시장 데이터 (금, 비트코인, 부동산)
      getHistoricalMarketData(),
      // 누적수익률 - 1번 시트 U9 셀 (정확한 누적수익률)
      fetchSheetDataCached(session.accessToken, user.spreadsheet_id, "'1. 계좌현황(누적)'!U9", user.id),
    ]);

    // 현재 환율 + performanceRows에 달러환율 적용 값 주입
    const currentRate = await getUSDKRWRate();
    const enrichedRows = performanceRows ? enrichRowsWithExchangeRates(performanceRows, historicalRates, currentRate) : null;

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

    // 계좌 유형별 배당 집계
    const generalDividends = dividends.filter(d => !d.account || d.account === '일반 계좌');
    const taxSavingDividends = dividends.filter(d => d.account === '절세 계좌');
    const dividendByAccount = (generalDividends.length > 0 || taxSavingDividends.length > 0) ? {
      general: computeDividendAccountData(generalDividends),
      taxSaving: computeDividendAccountData(taxSavingDividends),
    } : undefined;

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

    // 포트폴리오 파싱 (환율 전달: USD 평단가 → KRW 환산용)
    const portfolio: PortfolioItem[] = portfolioRows
      ? parsePortfolioData(portfolioRows, currentRate)
      : [];

    // 기타자산(암호화폐/금) 현재가 오버라이드
    // 시트의 수식이 BTC 등의 현재가를 알 수 없으므로 스프레드시트 API로 대체
    const altItems = portfolio.filter((item) => ALTERNATIVE_ASSET_CODES.has(item.ticker));
    if (altItems.length > 0) {
      try {
        const altPrices = await getAlternativeAssetPrices();
        for (const item of altItems) {
          const altPrice = altPrices.find((a) => a.code === item.ticker);
          if (altPrice && altPrice.price > 0) {
            item.currentPrice = altPrice.price;
            item.totalValue = altPrice.price * item.quantity;
            const invested = item.avgPrice * item.quantity;
            item.profit = item.totalValue - invested;
            item.yieldPercent = invested > 0 ? (item.profit / invested) * 100 : 0;
          }
        }
      } catch (error) {
        console.error('[Dashboard] Alternative asset price override failed:', error);
      }
    }

    // '5. 계좌내역(누적)'에서 총자산, 원금, 수익률 계산
    // E열(0)=연도, F열(1)=월, H열(3)=계좌총액, I열(4)=입금액, Y열(20)=누적수익률
    // 총자산: 현재 연도/월에 해당하는 H열 값 (SUMIFS 로직)
    // 원금: I열 전체 합계 (SUM)
    // 수익률: 현재 연도/월에 해당하는 Y열 값 (SUMIFS 로직)
    let totalAsset = 0;
    let totalInvested = 0;
    let totalYield = 0;
    let thisMonthYieldFromSheet: number | undefined;
    let thisYearYieldFromSheet: number | undefined;
    let thisYearDepositFromSheet = 0;

    const parseNumber = (val: any): number => {
      if (!val || val === '-') return 0;
      const cleaned = String(val).replace(/[₩$,%\s,]/g, '');
      return Number.parseFloat(cleaned) || 0;
    };

    const parsePercent = (val: any): number => {
      if (!val || val === '-') return 0;
      const num = parseNumber(val);
      // UNFORMATTED_VALUE로 인해 소수점 형식일 수 있음 (0.1566 = 15.66%, -0.03 = -3%)
      const absNum = Math.abs(num);
      if (absNum > 0 && absNum < 10) {
        return num * 100;
      }
      return num;
    };

    if (accountHistoryRows && accountHistoryRows.length > 0) {
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const prevYear = currentYear - 1;

      let thisYearDeposit = 0;
      let startOfYearAsset = 0;

      // I열(index 4) 전체 합계 계산 = SUM(I:I)
      // + 올해 입금액 합계 + 작년 12월 잔액 찾기
      for (const row of accountHistoryRows) {
        if (!row || !Array.isArray(row)) continue;
        const investedVal = parseNumber(row[4]); // I열
        totalInvested += investedVal;

        // 연도/월 파싱
        const yearVal = String(row[0] || '').trim();
        const monthVal = String(row[1] || '').trim();
        const year = Number.parseInt(yearVal.replace(/[^0-9]/g, ''), 10);
        const monthMatch = monthVal.match(/(\d+)/);
        const month = monthMatch ? Number.parseInt(monthMatch[1] || '', 10) : 0;

        // 올해 입금액 합계 (SUMIFS 연도=올해)
        if (year === currentYear) {
          thisYearDeposit += investedVal;
        }

        // 작년 12월 잔액 (연초 시작 잔액)
        if (year === prevYear && month === 12) {
          startOfYearAsset = parseNumber(row[3]); // H열
        }
      }

      // 현재 연도/월에 해당하는 H열, K열, Y열 값 찾기 = SUMIFS 로직
      for (const row of accountHistoryRows) {
        if (!row || !Array.isArray(row)) continue;

        const yearVal = String(row[0] || '').trim();
        const monthVal = String(row[1] || '').trim();

        // 연도 파싱
        const year = Number.parseInt(yearVal.replace(/[^0-9]/g, ''), 10);
        if (year !== currentYear) continue;

        // 월 파싱 ("12월" -> 12)
        const monthMatch = monthVal.match(/(\d+)/);
        if (!monthMatch) continue;
        const month = Number.parseInt(monthMatch[1] || '', 10);

        if (month === currentMonth) {
          // H열(index 3) = 계좌총액, K열(index 6) = 이번달 수익률, Y열(index 20) = 누적수익률
          totalAsset = parseNumber(row[3]);
          thisMonthYieldFromSheet = parsePercent(row[6]);
          totalYield = parsePercent(row[20]);
          break;
        }
      }

      // 현재 월 데이터가 없으면 가장 최근 데이터 사용
      if (totalAsset === 0) {
        for (let i = accountHistoryRows.length - 1; i >= 0; i--) {
          const row = accountHistoryRows[i];
          if (!row || !Array.isArray(row)) continue;

          const assetVal = parseNumber(row[3]);
          if (assetVal > 0) {
            totalAsset = assetVal;
            thisMonthYieldFromSheet = parsePercent(row[6]);
            totalYield = parsePercent(row[20]);
            break;
          }
        }
      }

      // 올해 수익률 계산: (현재잔액 - 연초잔액 - 올해입금) / 연초잔액 * 100
      if (startOfYearAsset > 0 && totalAsset > 0) {
        const thisYearProfit = totalAsset - startOfYearAsset - thisYearDeposit;
        thisYearYieldFromSheet = (thisYearProfit / startOfYearAsset) * 100;
      }
      thisYearDepositFromSheet = thisYearDeposit;
    }

    // 1번 시트 U9 누적수익률 우선 사용 (UNFORMATTED_VALUE: 소수점 형식)
    if (yieldCell && yieldCell.length > 0 && yieldCell[0]?.length > 0) {
      const rawYield = Number(yieldCell[0][0]);
      if (!Number.isNaN(rawYield) && rawYield !== 0) {
        // UNFORMATTED_VALUE: 1.569 = 156.9%, -0.03 = -3%
        totalYield = Math.abs(rawYield) < 10 ? rawYield * 100 : rawYield;
      }
    }

    // fallback: 포트폴리오에서 계산
    if (totalAsset === 0) {
      for (const item of portfolio) {
        totalAsset += item.totalValue;
      }
    }
    if (totalInvested === 0) {
      for (const item of portfolio) {
        totalInvested += item.avgPrice * item.quantity;
      }
    }
    if (totalYield === 0 && totalInvested > 0) {
      totalYield = ((totalAsset - totalInvested) / totalInvested) * 100;
    }

    const totalProfit = totalAsset - totalInvested;

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
              account: d.account || '일반 계좌',
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

    // 수익률 비교 파싱 (enrichedRows 사용 → 달러환율 적용 데이터 포함)
    const performanceComparison: PerformanceComparisonData[] = (enrichedRows || performanceRows)
      ? parsePerformanceComparisonData(enrichedRows || performanceRows!)
      : [];

    // Fallback: 시트의 지수 데이터가 모두 0이면 공개 마켓 데이터로 보강
    if (performanceComparison.length > 0 && marketData) {
      const hasIndexData = performanceComparison.some(d => d.kospi !== 0 || d.sp500 !== 0 || d.nasdaq !== 0);
      if (!hasIndexData) {
        const firstDate = performanceComparison[0]!.date;
        const [firstYY, firstMM] = firstDate.split('.').map(Number) as [number, number];
        const baseMonth = (firstMM || 1) - 1;
        const baseYear = baseMonth <= 0 ? (firstYY || 0) - 1 : (firstYY || 0);
        const effectiveMonth = baseMonth <= 0 ? 12 : baseMonth;
        const baselineKey = `${String(baseYear).padStart(2, '0')}.${String(effectiveMonth).padStart(2, '0')}`;

        const kospiStart = marketData.kospi?.get(baselineKey);
        const sp500Start = marketData.sp500?.get(baselineKey);
        const nasdaqStart = marketData.nasdaq?.get(baselineKey);
        const sp500KrwStart = marketData.sp500Krw?.get(baselineKey);
        const nasdaqKrwStart = marketData.nasdaqKrw?.get(baselineKey);
        const round1 = (n: number) => Math.round(n * 10) / 10;

        for (const item of performanceComparison) {
          const kospiVal = marketData.kospi?.get(item.date);
          const sp500Val = marketData.sp500?.get(item.date);
          const nasdaqVal = marketData.nasdaq?.get(item.date);

          item.kospi = kospiStart && kospiVal ? round1(((kospiVal / kospiStart) - 1) * 100) : 0;
          item.sp500 = sp500Start && sp500Val ? round1(((sp500Val / sp500Start) - 1) * 100) : 0;
          item.nasdaq = nasdaqStart && nasdaqVal ? round1(((nasdaqVal / nasdaqStart) - 1) * 100) : 0;

          if (sp500KrwStart) {
            const sp500KrwVal = marketData.sp500Krw?.get(item.date);
            if (sp500KrwVal) item.sp500Dollar = round1(((sp500KrwVal / sp500KrwStart) - 1) * 100);
          }
          if (nasdaqKrwStart) {
            const nasdaqKrwVal = marketData.nasdaqKrw?.get(item.date);
            if (nasdaqKrwVal) item.nasdaqDollar = round1(((nasdaqKrwVal / nasdaqKrwStart) - 1) * 100);
          }
        }
        console.log('[getDashboardData] Index data enriched from public market data (sheet had no index data)');
      }
    }

    // 계좌 추세 파싱 (같은 performanceRows에서)
    const accountTrend: AccountTrendData[] = performanceRows
      ? parseAccountTrendData(performanceRows)
      : [];

    // 월별 손익 파싱
    const monthlyProfitLoss: MonthlyProfitLoss[] = profitLossRows
      ? parseMonthlyProfitLoss(profitLossRows)
      : [];

    // 수익률 비교 바 차트 데이터 파싱 (같은 performanceRows에서)
    let yieldComparison: YieldComparisonData | null = performanceRows
      ? parseYieldComparisonData(performanceRows)
      : null;

    // Fallback: 시트의 지수 데이터가 0이면 공개 마켓 데이터로 보강
    if (yieldComparison && marketData) {
      const ty = yieldComparison.thisYearYield;
      const hasIndexYield = ty.kospi !== 0 || ty.sp500 !== 0 || ty.nasdaq !== 0;
      if (!hasIndexYield) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const prevDecKey = `${String(currentYear - 1).slice(-2)}.12`;
        const currentKey = `${String(currentYear).slice(-2)}.${String(currentMonth).padStart(2, '0')}`;

        const kospiPrev = marketData.kospi?.get(prevDecKey);
        const sp500Prev = marketData.sp500?.get(prevDecKey);
        const nasdaqPrev = marketData.nasdaq?.get(prevDecKey);
        const kospiCur = marketData.kospi?.get(currentKey);
        const sp500Cur = marketData.sp500?.get(currentKey);
        const nasdaqCur = marketData.nasdaq?.get(currentKey);

        if (kospiPrev && kospiCur) ty.kospi = ((kospiCur / kospiPrev) - 1) * 100;
        if (sp500Prev && sp500Cur) ty.sp500 = ((sp500Cur / sp500Prev) - 1) * 100;
        if (nasdaqPrev && nasdaqCur) ty.nasdaq = ((nasdaqCur / nasdaqPrev) - 1) * 100;

        // 누적/연평균도 보강
        const ay = yieldComparison.annualizedYield;
        if (ay.kospi === 0 || ay.sp500 === 0 || ay.nasdaq === 0) {
          // 첫 데이터 날짜에서 baseline 찾기
          let firstDateKey: string | null = null;
          if (performanceRows) {
            for (const row of performanceRows) {
              if (!row || !Array.isArray(row)) continue;
              const d = String(row[0] || '').trim();
              if (/^\d{2}\.\d{2}$/.test(d)) { firstDateKey = d; break; }
            }
          }
          if (firstDateKey) {
            const [fy] = firstDateKey.split('.').map(Number);
            const firstYear = 2000 + (fy || 0);
            const years = Math.max(1, currentYear - firstYear);
            const baseKey = `${String(fy! - 1).padStart(2, '0')}.12`;
            const kospiBase = marketData.kospi?.get(baseKey);
            const sp500Base = marketData.sp500?.get(baseKey);
            const nasdaqBase = marketData.nasdaq?.get(baseKey);

            const calcAnnualized = (cur: number, base: number) => {
              const total = cur / base;
              if (total <= 0 || years <= 0) return 0;
              return (total ** (1 / years) - 1) * 100;
            };
            if (kospiBase && kospiCur) ay.kospi = calcAnnualized(kospiCur, kospiBase);
            if (sp500Base && sp500Cur) ay.sp500 = calcAnnualized(sp500Cur, sp500Base);
            if (nasdaqBase && nasdaqCur) ay.nasdaq = calcAnnualized(nasdaqCur, nasdaqBase);
          }
        }
        console.log('[getDashboardData] YieldComparison enriched from public market data');
      }
    }

    // 수익률 비교 달러환율 적용 파싱 (확장된 범위에서 달러 컬럼 포함)
    const yieldComparisonDollar: YieldComparisonDollarData | null = enrichedRows
      ? parseYieldComparisonDollarData(enrichedRows)
      : null;

    // 월별 수익률 비교 파싱 (이번 달 + 올해 수익률, DOLLAR 포함)
    const monthlyYieldComparison: MonthlyYieldComparisonData | null = enrichedRows
      ? parseMonthlyYieldComparisonWithDollar(enrichedRows)
      : null;

    // 월별 수익률 비교 - 환율 반영 파싱 (S&P500, NASDAQ 달러환율 적용)
    const monthlyYieldComparisonDollarApplied: MonthlyYieldComparisonDollarAppliedData | null = enrichedRows
      ? parseMonthlyYieldComparisonDollarApplied(enrichedRows)
      : null;

    // 주요지수 수익률 비교 라인차트 파싱
    let majorIndexYieldComparison: MajorIndexYieldComparisonData | null = enrichedRows
      ? parseMajorIndexYieldComparison(enrichedRows)
      : null;

    // 추가 시장 지표 수익률 병합 (금, 비트코인, 부동산)
    if (majorIndexYieldComparison && marketData) {
      const marketYields = calculateMarketYields(
        majorIndexYieldComparison.months,
        marketData,
        new Date().getFullYear()
      );
      majorIndexYieldComparison = {
        ...majorIndexYieldComparison,
        gold: marketYields.gold,
        bitcoin: marketYields.bitcoin,
        realEstate: marketYields.realEstate,
        goldDollar: marketYields.goldDollar,
        bitcoinDollar: marketYields.bitcoinDollar,
      };
      // dollar 수익률도 marketYields에서 가져옴 (기존 dollar 없는 경우)
      if (!majorIndexYieldComparison.dollar) {
        majorIndexYieldComparison.dollar = marketYields.dollar;
      }
    }

    // 투자 일수 계산: TODAY() - MIN(B:B) + 1
    let investmentDays = 0;
    if (depositDateRows && depositDateRows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let minDate: Date | null = null;

      for (const row of depositDateRows) {
        const val = row[0];
        if (!val) continue;

        let date: Date | null = null;

        // 시리얼 넘버 처리 (UNFORMATTED_VALUE)
        if (typeof val === 'number' && val > 30000 && val < 100000) {
          date = new Date((val - 25569) * 86400 * 1000);
        } else {
          // 문자열 날짜 파싱
          const str = String(val).trim();
          const match = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
          if (match) {
            date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
          }
        }

        if (date && !Number.isNaN(date.getTime())) {
          if (!minDate || date < minDate) {
            minDate = date;
          }
        }
      }

      if (minDate) {
        minDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - minDate.getTime();
        investmentDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

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
      thisMonthYield: thisMonthYieldFromSheet !== undefined ? Number.parseFloat(thisMonthYieldFromSheet.toFixed(2)) : undefined,
      thisYearYield: thisYearYieldFromSheet !== undefined ? Number.parseFloat(thisYearYieldFromSheet.toFixed(2)) : undefined,
      thisYearDeposit: Math.round(thisYearDepositFromSheet),
      investmentDays,
      lastSyncAt: new Date().toISOString(),
      dividendByAccount,
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
      investmentDays: 0,
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
    fetchSheetData(accessToken, spreadsheetId, "'7. 배당내역'!A:K"),
    fetchSheetData(accessToken, spreadsheetId, "'6. 입금내역'!A:J"), // A:F -> A:J로 확장 (금액 컬럼 포함)
  ]);

  // 1. 포트폴리오 파싱 및 저장 (환율 전달: USD 평단가 → KRW 환산용)
  const syncExchangeRate = await getUSDKRWRate();
  const portfolio = parsePortfolioData(portfolioRows || [], syncExchangeRate);
  let portfolioCount = 0;
  let holdingsCount = 0;

  // 기타자산 현재가 오버라이드 (sync 시에도 올바른 현재가로 캐시)
  const syncAltItems = portfolio.filter((item) => ALTERNATIVE_ASSET_CODES.has(item.ticker));
  if (syncAltItems.length > 0) {
    try {
      const altPrices = await getAlternativeAssetPrices();
      for (const item of syncAltItems) {
        const altPrice = altPrices.find((a) => a.code === item.ticker);
        if (altPrice && altPrice.price > 0) {
          item.currentPrice = altPrice.price;
          item.totalValue = altPrice.price * item.quantity;
          const invested = item.avgPrice * item.quantity;
          item.profit = item.totalValue - invested;
          item.yieldPercent = invested > 0 ? (item.profit / invested) * 100 : 0;
        }
      }
    } catch (error) {
      console.error('[syncSheetData] Alternative asset price override failed:', error);
    }
  }

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
    // avgPrice=0인 항목은 기존 DB값 유지 (시트에서 수동 추가한 미국주식의 원화평단가가 비어있을 수 있음)
    const { data: existingHoldings } = await supabase
      .from('holdings')
      .select('ticker, avg_price')
      .eq('user_id', userId);
    const existingAvgPriceMap = new Map(
      existingHoldings?.map((h) => [h.ticker, h.avg_price]) || []
    );

    const holdingsData = portfolio.map((item) => ({
      user_id: userId,
      ticker: item.ticker,
      name: item.name,
      quantity: item.quantity,
      // avgPriceOriginal: USD 평단가 원본값 (DB에는 원본 통화로 저장)
      // avgPrice: KRW 환산된 값 (표시/계산용)
      avg_price: item.avgPriceOriginal
        ? item.avgPriceOriginal
        : (item.avgPrice > 0 ? item.avgPrice : (existingAvgPriceMap.get(item.ticker) || 0)),
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
        account: d.account || '일반 계좌',
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

/**
 * Standalone 모드 대시보드 데이터 조회
 * DB + 외부 API (환율, 주가)를 사용하여 데이터 생성
 */
async function getStandaloneDashboardData(userId: string): Promise<DashboardData> {
  const supabase = createServiceClient();
  const provider = new StandaloneDataProvider();

  try {
    // 환율 조회
    const exchangeRate = await getUSDKRWRate();
    const historicalRates = await getHistoricalExchangeRates();
    const marketData = await getHistoricalMarketData();

    // 1. 포트폴리오 + 계좌추세 + 월별손익 병렬 조회
    const [portfolioItems, rawAccountTrend, monthlyProfitLoss] = await Promise.all([
      provider.getPortfolio(userId),
      provider.getAccountTrend(userId),
      provider.getMonthlyProfitLoss(userId),
    ]);

    // accountTrend를 올해 1월부터 패딩 (투자 시작 전 월은 0으로 채움)
    const accountTrend: AccountTrendData[] = (() => {
      if (rawAccountTrend.length === 0) return rawAccountTrend;
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const yyStr = String(currentYear).slice(-2);
      const existingDates = new Set(rawAccountTrend.map(t => t.date));
      const padded: AccountTrendData[] = [];
      for (let m = 1; m <= currentMonth; m++) {
        const dateKey = `${yyStr}.${String(m).padStart(2, '0')}`;
        if (existingDates.has(dateKey)) break;
        padded.push({ date: dateKey, totalAccount: 0, cumulativeDeposit: 0 });
      }
      return [...padded, ...rawAccountTrend];
    })();
    const portfolio: PortfolioItem[] = portfolioItems.map((item, index) => ({
      ticker: item.ticker,
      name: item.name,
      country: item.currency === 'USD' ? '미국' : '한국',
      currency: item.currency,
      quantity: item.quantity,
      avgPrice: item.avgPrice,
      avgPriceOriginal: item.avgPriceOriginal,
      currentPrice: item.currentPrice,
      totalValue: item.totalValue,
      profit: item.profit,
      yieldPercent: item.profitPercent,
      weight: item.weight || 0,
      rowIndex: index + 9, // standalone에서는 가상 rowIndex
    }));

    // 2. 대시보드 요약 조회
    const summary = await provider.getDashboardSummary(userId);

    // 3. 배당금 내역 조회 (monthlyDividends 계산용)
    const dividends = await provider.getDividends(userId);

    // DividendRecord 형식으로 변환
    const dividendRecords: DividendRecord[] = dividends.map(d => ({
      date: d.date,
      ticker: d.ticker,
      name: d.name,
      amountKRW: d.amountKRW,
      amountUSD: d.amountUSD,
      totalKRW: d.amountKRW + (d.amountUSD * exchangeRate), // 원화 환산
      account: d.account || undefined,
    }));

    // 배당금 집계
    const monthlyDividends = aggregateMonthlyDividends(dividendRecords);
    const dividendByYear = aggregateDividendsByYear(dividendRecords);
    const yearlyDividendSummary = aggregateYearlyDividends(dividendRecords);
    const rollingAverageDividend = calculateRollingAverageDividend(dividendRecords);
    const cumulativeDividend = calculateCumulativeDividend(dividendRecords);

    // 계좌 유형별 배당 집계
    const generalDividends = dividendRecords.filter(d => !d.account || d.account === '일반 계좌');
    const taxSavingDividends = dividendRecords.filter(d => d.account === '절세 계좌');
    const dividendByAccount = (generalDividends.length > 0 || taxSavingDividends.length > 0) ? {
      general: computeDividendAccountData(generalDividends),
      taxSaving: computeDividendAccountData(taxSavingDividends),
    } : undefined;

    // 4. 주요 지수 수익률 비교 데이터 조회
    const majorIndexYieldComparison = await provider.getMajorIndexYieldComparison(userId, historicalRates, marketData);

    // 4-1. 올해/당월 수익률 바 차트 데이터 계산
    let monthlyYieldComparison: MonthlyYieldComparisonData | null = null;
    if (majorIndexYieldComparison && marketData) {
      const now = new Date();
      const cm = now.getMonth() + 1; // 1-indexed
      const cy = now.getFullYear();
      const yearStr = String(cy).slice(-2);
      const prevYearStr = String(cy - 1).slice(-2);

      const curKey = `${yearStr}.${String(cm).padStart(2, '0')}`;
      const prevKey = cm === 1
        ? `${prevYearStr}.12`
        : `${yearStr}.${String(cm - 1).padStart(2, '0')}`;

      const round1 = (val: number) => Math.round(val * 10) / 10;
      const momYield = (cur: number | undefined, prev: number | undefined): number => {
        if (!cur || !prev || prev === 0) return 0;
        return round1((cur / prev - 1) * 100);
      };

      // YTD (올해 수익률) - majorIndexYieldComparison 마지막 값
      const lastIdx = majorIndexYieldComparison.months.length - 1;
      const lastAccountValue = majorIndexYieldComparison.account.reduce<number | null>(
        (last, val) => val !== null ? val : last, null
      );

      // 이번 달 계좌 수익률 (YTD 배열에서 MoM 역산)
      let accountMoM = 0;
      const accountArr = majorIndexYieldComparison.account;
      if (lastIdx >= 1) {
        const curYtd = accountArr[lastIdx] ?? undefined;
        const prevYtd = accountArr[lastIdx - 1] ?? undefined;
        if (curYtd !== undefined && prevYtd !== undefined) {
          accountMoM = round1(((1 + curYtd / 100) / (1 + prevYtd / 100) - 1) * 100);
        } else if (curYtd !== undefined) {
          accountMoM = curYtd;
        }
      }

      monthlyYieldComparison = {
        currentMonthYield: {
          account: accountMoM,
          kospi: momYield(marketData.kospi?.get(curKey), marketData.kospi?.get(prevKey)),
          sp500: momYield(marketData.sp500?.get(curKey), marketData.sp500?.get(prevKey)),
          nasdaq: momYield(marketData.nasdaq?.get(curKey), marketData.nasdaq?.get(prevKey)),
          dollar: momYield(marketData.exchangeRates.get(curKey), marketData.exchangeRates.get(prevKey)),
        },
        thisYearYield: {
          account: lastAccountValue ?? 0,
          kospi: majorIndexYieldComparison.kospi[lastIdx] || 0,
          sp500: majorIndexYieldComparison.sp500[lastIdx] || 0,
          nasdaq: majorIndexYieldComparison.nasdaq[lastIdx] || 0,
          dollar: majorIndexYieldComparison.dollar?.[lastIdx] || 0,
        },
        currentMonth: `${cm}월`,
      };
    }

    // 4-2. 올해/당월 수익률 바 차트 (달러환율 반영) 데이터 계산
    let monthlyYieldComparisonDollarApplied: MonthlyYieldComparisonDollarAppliedData | null = null;
    if (majorIndexYieldComparison && marketData) {
      const now2 = new Date();
      const cm2 = now2.getMonth() + 1;
      const cy2 = now2.getFullYear();
      const yearStr2 = String(cy2).slice(-2);
      const prevYearStr2 = String(cy2 - 1).slice(-2);

      const curKey2 = `${yearStr2}.${String(cm2).padStart(2, '0')}`;
      const prevKey2 = cm2 === 1
        ? `${prevYearStr2}.12`
        : `${yearStr2}.${String(cm2 - 1).padStart(2, '0')}`;

      const round1d = (val: number) => Math.round(val * 10) / 10;
      const momYieldD = (cur: number | undefined, prev: number | undefined): number => {
        if (!cur || !prev || prev === 0) return 0;
        return round1d((cur / prev - 1) * 100);
      };

      // 계좌 MoM (기본 차트와 동일)
      const lastIdx2 = majorIndexYieldComparison.months.length - 1;
      let accountMoM2 = 0;
      const accountArr2 = majorIndexYieldComparison.account;
      if (lastIdx2 >= 1) {
        const curYtd2 = accountArr2[lastIdx2] ?? undefined;
        const prevYtd2 = accountArr2[lastIdx2 - 1] ?? undefined;
        if (curYtd2 !== undefined && prevYtd2 !== undefined) {
          accountMoM2 = round1d(((1 + curYtd2 / 100) / (1 + prevYtd2 / 100) - 1) * 100);
        } else if (curYtd2 !== undefined) {
          accountMoM2 = curYtd2;
        }
      }

      const lastAccountValue2 = majorIndexYieldComparison.account.reduce<number | null>(
        (last, val) => val !== null ? val : last, null
      );

      monthlyYieldComparisonDollarApplied = {
        currentMonthYield: {
          account: accountMoM2,
          kospi: momYieldD(marketData.kospi?.get(curKey2), marketData.kospi?.get(prevKey2)),
          sp500: momYieldD(marketData.sp500Krw?.get(curKey2), marketData.sp500Krw?.get(prevKey2)),
          nasdaq: momYieldD(marketData.nasdaqKrw?.get(curKey2), marketData.nasdaqKrw?.get(prevKey2)),
        },
        thisYearYield: {
          account: lastAccountValue2 ?? 0,
          kospi: majorIndexYieldComparison.kospi[lastIdx2] || 0,
          sp500: majorIndexYieldComparison.sp500Dollar?.[lastIdx2] || 0,
          nasdaq: majorIndexYieldComparison.nasdaqDollar?.[lastIdx2] || 0,
        },
        currentMonth: `${cm2}월`,
      };
    }

    // 5. 올해 입금액 계산
    const currentYear = new Date().getFullYear();
    const { data: yearDeposits } = await (supabase as any)
      .from('deposits')
      .select('amount, type')
      .eq('user_id', userId)
      .gte('deposit_date', `${currentYear}-01-01`)
      .lte('deposit_date', `${currentYear}-12-31`);

    let thisYearDeposit = 0;
    for (const d of yearDeposits || []) {
      thisYearDeposit += d.type === 'DEPOSIT' ? (d.amount || 0) : -(d.amount || 0);
    }

    // 누적수익률/연평균수익률 비교 데이터 계산 (Standalone)
    let yieldComparison: YieldComparisonData | null = null;
    let yieldComparisonDollar: YieldComparisonDollarData | null = null;
    if (majorIndexYieldComparison && marketData) {
      const round1 = (n: number) => Math.round(n * 10) / 10;

      // 1. 올해 수익률: majorIndexYieldComparison 마지막 값
      const lastIdx = majorIndexYieldComparison.months.length - 1;
      const thisYearYield = {
        account: round1(majorIndexYieldComparison.account[lastIdx] ?? 0),
        kospi: round1(majorIndexYieldComparison.kospi[lastIdx] ?? 0),
        sp500: round1(majorIndexYieldComparison.sp500[lastIdx] ?? 0),
        nasdaq: round1(majorIndexYieldComparison.nasdaq[lastIdx] ?? 0),
      };

      // 2. 누적수익률: 계좌는 summary.totalYield, 지수는 투자 시작월 대비 현재 가격
      const accountCumulative = round1(summary.totalYield);
      let kospiCumulative = 0;
      let sp500Cumulative = 0;
      let nasdaqCumulative = 0;
      let dollarCumulative = 0;
      let sp500KrwCumulative = 0;
      let nasdaqKrwCumulative = 0;

      if (summary.investmentDays >= 0) {
        const startDate = new Date(Date.now() - (summary.investmentDays - 1) * 24 * 60 * 60 * 1000);

        const nowDate = new Date();
        const nowYY = String(nowDate.getFullYear()).slice(2);
        const nowMM = String(nowDate.getMonth() + 1).padStart(2, '0');
        const nowKey = `${nowYY}.${nowMM}`;

        // 지수 비교 baseline: 투자 시작 전월 말 기준 (2월 시작 → 1월 말, 1월 시작 → 전년 12월 말)
        const baselineDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
        const indexBaselineKey = `${String(baselineDate.getFullYear()).slice(2)}.${String(baselineDate.getMonth() + 1).padStart(2, '0')}`;

        const calcCumulative = (dataMap: Map<string, number> | undefined): number => {
          if (!dataMap) return 0;
          const startVal = dataMap.get(indexBaselineKey);
          const nowVal = dataMap.get(nowKey);
          if (!startVal || !nowVal || startVal === 0) return 0;
          return round1(((nowVal / startVal) - 1) * 100);
        };

        kospiCumulative = calcCumulative(marketData.kospi);
        sp500Cumulative = calcCumulative(marketData.sp500);
        nasdaqCumulative = calcCumulative(marketData.nasdaq);

        // 환율 적용 수익률 비교 데이터 (달러 환율 반영)
        if (marketData.exchangeRates && marketData.sp500Krw && marketData.nasdaqKrw) {
          dollarCumulative = calcCumulative(marketData.exchangeRates);
          sp500KrwCumulative = calcCumulative(marketData.sp500Krw);
          nasdaqKrwCumulative = calcCumulative(marketData.nasdaqKrw);
        }
      }

      const cumulativeYield = {
        account: accountCumulative,
        kospi: kospiCumulative,
        sp500: sp500Cumulative,
        nasdaq: nasdaqCumulative,
      };

      // 3. 연평균수익률: (1 + cumulative/100)^(1/years) - 1
      const years = Math.max(1, summary.investmentDays / 365);
      const calcAnnualized = (cumulative: number): number => {
        const total = 1 + cumulative / 100;
        if (total <= 0) return 0;
        return round1((total ** (1 / years) - 1) * 100);
      };

      const annualizedYield = {
        account: calcAnnualized(accountCumulative),
        kospi: calcAnnualized(kospiCumulative),
        sp500: calcAnnualized(sp500Cumulative),
        nasdaq: calcAnnualized(nasdaqCumulative),
      };

      yieldComparison = { cumulativeYield, thisYearYield, annualizedYield };

      // 환율 적용 수익률 비교 결과 생성
      if (marketData.exchangeRates && marketData.sp500Krw && marketData.nasdaqKrw) {
        const prevYearKey = `${String(new Date().getFullYear() - 1).slice(2)}.12`;
        const nowKey2 = `${String(new Date().getFullYear()).slice(2)}.${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const ytdCalc = (dataMap: Map<string, number> | undefined): number => {
          if (!dataMap) return 0;
          const prev = dataMap.get(prevYearKey);
          const now = dataMap.get(nowKey2);
          if (!prev || !now || prev === 0) return 0;
          return round1(((now / prev) - 1) * 100);
        };

        yieldComparisonDollar = {
          cumulativeYield: {
            account: accountCumulative,
            kospi: kospiCumulative,
            sp500: sp500KrwCumulative,
            nasdaq: nasdaqKrwCumulative,
            dollar: dollarCumulative,
          },
          thisYearYield: {
            account: thisYearYield.account,
            kospi: thisYearYield.kospi,
            sp500: ytdCalc(marketData.sp500Krw),
            nasdaq: ytdCalc(marketData.nasdaqKrw),
            dollar: ytdCalc(marketData.exchangeRates),
          },
          annualizedYield: {
            account: calcAnnualized(accountCumulative),
            kospi: calcAnnualized(kospiCumulative),
            sp500: calcAnnualized(sp500KrwCumulative),
            nasdaq: calcAnnualized(nasdaqKrwCumulative),
            dollar: calcAnnualized(dollarCumulative),
          },
        };
      }
    }

    // 5. 누적 수익률 비교 데이터 생성 (accountTrend + marketData)
    const performanceComparison: PerformanceComparisonData[] = [];
    if (accountTrend.length > 0 && marketData) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const yyStr = String(currentYear).slice(-2);
      const round1 = (n: number) => Math.round(n * 10) / 10;

      // accountTrend를 date 키로 빠르게 조회하기 위한 맵
      const trendMap = new Map(accountTrend.map(t => [t.date, t]));

      // 유저의 첫 데이터 월 찾기 (투자 시작월)
      let startMonth = 1;
      for (let m = 1; m <= currentMonth; m++) {
        const dateKey = `${yyStr}.${String(m).padStart(2, '0')}`;
        const trend = trendMap.get(dateKey);
        if (trend && trend.cumulativeDeposit > 0) {
          startMonth = m;
          break;
        }
      }

      // 지수 baseline: 투자 시작 전월 말 기준 (2월 시작 → 26.01, 1월 시작 → 25.12)
      const baselineMonth = startMonth - 1;
      const baselineYear = baselineMonth <= 0 ? currentYear - 1 : currentYear;
      const effectiveBaselineMonth = baselineMonth <= 0 ? 12 : baselineMonth;
      const baselineKey = `${String(baselineYear).slice(-2)}.${String(effectiveBaselineMonth).padStart(2, '0')}`;

      const kospiStart = marketData.kospi?.get(baselineKey);
      const sp500Start = marketData.sp500?.get(baselineKey);
      const nasdaqStart = marketData.nasdaq?.get(baselineKey);
      const sp500KrwStart = marketData.sp500Krw?.get(baselineKey);
      const nasdaqKrwStart = marketData.nasdaqKrw?.get(baselineKey);

      // 1월~현재월까지 항상 포함
      for (let m = 1; m <= currentMonth; m++) {
        const dateKey = `${yyStr}.${String(m).padStart(2, '0')}`;

        // 유저 데이터가 없는 월(투자 시작 전)은 전부 0%
        if (m < startMonth) {
          performanceComparison.push({
            date: dateKey,
            portfolio: 0,
            kospi: 0,
            sp500: 0,
            nasdaq: 0,
          });
          continue;
        }

        const trend = trendMap.get(dateKey);
        const portfolioReturn = trend && trend.cumulativeDeposit > 0
          ? round1(((trend.totalAccount - trend.cumulativeDeposit) / trend.cumulativeDeposit) * 100)
          : 0;

        const kospiVal = marketData.kospi?.get(dateKey);
        const sp500Val = marketData.sp500?.get(dateKey);
        const nasdaqVal = marketData.nasdaq?.get(dateKey);
        const sp500KrwVal = marketData.sp500Krw?.get(dateKey);
        const nasdaqKrwVal = marketData.nasdaqKrw?.get(dateKey);

        const item: PerformanceComparisonData = {
          date: dateKey,
          portfolio: portfolioReturn,
          kospi: kospiStart && kospiVal ? round1(((kospiVal / kospiStart) - 1) * 100) : 0,
          sp500: sp500Start && sp500Val ? round1(((sp500Val / sp500Start) - 1) * 100) : 0,
          nasdaq: nasdaqStart && nasdaqVal ? round1(((nasdaqVal / nasdaqStart) - 1) * 100) : 0,
        };

        if (sp500KrwStart && sp500KrwVal) {
          item.sp500Dollar = round1(((sp500KrwVal / sp500KrwStart) - 1) * 100);
        }
        if (nasdaqKrwStart && nasdaqKrwVal) {
          item.nasdaqDollar = round1(((nasdaqKrwVal / nasdaqKrwStart) - 1) * 100);
        }

        performanceComparison.push(item);
      }
    }

    return {
      totalAsset: summary.totalAsset,
      totalYield: summary.totalYield,
      totalInvested: summary.totalInvested,
      totalProfit: summary.totalProfit,
      thisMonthDividend: summary.thisMonthDividend,
      yearlyDividend: summary.yearlyDividend,
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
      thisYearDeposit: Math.round(thisYearDeposit),
      investmentDays: summary.investmentDays,
      lastSyncAt: new Date().toISOString(),
      dividendByAccount,
      // 이번달 수익률: monthlyYieldComparison의 MoM 계좌 수익률 사용 (전월 잔액 대비)
      thisMonthYield: monthlyYieldComparison?.currentMonthYield?.account,
    };
  } catch (error) {
    console.error('[getStandaloneDashboardData] Error:', error);

    // 에러 시 기본값 반환
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
      investmentDays: 0,
      lastSyncAt: null,
    };
  }
}
