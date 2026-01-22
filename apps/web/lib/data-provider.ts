/**
 * 데이터 프로바이더 추상화
 *
 * 두 가지 모드 지원:
 * 1. SheetDataProvider: Google Spreadsheet 연동 모드
 * 2. StandaloneDataProvider: DB + 외부 API 기반 독립 모드
 */

import { createServiceClient } from '@repo/database/server';
import { getUSDKRWRate } from './exchange-rate-api';
import { getStockPrices, isKoreanStock, type StockPrice } from './stock-price-api';
import {
  getKOSPIIndex,
  getSP500Index,
  getNASDAQIndex,
  type IndexData,
} from './index-data-api';
import type { MajorIndexYieldComparisonData } from './google-sheets';

// ============================================
// 공통 타입 정의
// ============================================

export interface PortfolioItem {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  profitPercent: number;
  currency: 'KRW' | 'USD';
  weight?: number; // 포트폴리오 비중 (%)
}

export interface DashboardSummary {
  totalAsset: number;       // 총 자산 (KRW)
  totalInvested: number;    // 총 투자원금 (KRW)
  totalProfit: number;      // 총 수익금
  totalYield: number;       // 수익률 (%)
  thisMonthDividend: number;
  yearlyDividend: number;
  investmentDays: number;
}

export interface DividendRecord {
  id?: string;
  ticker: string;
  name: string;
  amountKRW: number;
  amountUSD: number;
  date: string;
}

export interface DepositRecord {
  id?: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  date: string;
  memo?: string;
  account?: string;
}

// ============================================
// 데이터 프로바이더 인터페이스
// ============================================

export interface DataProvider {
  mode: 'sheet' | 'standalone';

  // 대시보드 요약
  getDashboardSummary(userId: string): Promise<DashboardSummary>;

  // 포트폴리오
  getPortfolio(userId: string): Promise<PortfolioItem[]>;

  // 배당금
  getDividends(userId: string, year?: number): Promise<DividendRecord[]>;
  saveDividend(userId: string, dividend: DividendRecord): Promise<boolean>;
  deleteDividend(userId: string, dividend: DividendRecord): Promise<boolean>;

  // 입출금
  getDeposits(userId: string): Promise<DepositRecord[]>;
  saveDeposit(userId: string, deposit: DepositRecord): Promise<boolean>;
  deleteDeposit(userId: string, deposit: DepositRecord): Promise<boolean>;
}

// ============================================
// Standalone 데이터 프로바이더 (DB + API)
// ============================================

export class StandaloneDataProvider implements DataProvider {
  mode: 'sheet' | 'standalone' = 'standalone';

  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const supabase = createServiceClient();

    // 포트폴리오 조회
    const portfolio = await this.getPortfolio(userId);

    // 총 자산 및 투자원금 계산
    let totalAsset = 0;
    let totalInvested = 0;

    const exchangeRate = await getUSDKRWRate();

    for (const item of portfolio) {
      const rate = item.currency === 'USD' ? exchangeRate : 1;
      totalAsset += item.totalValue * rate;
      totalInvested += item.avgPrice * item.quantity * rate;
    }

    const totalProfit = totalAsset - totalInvested;
    const totalYield = totalInvested > 0
      ? ((totalAsset - totalInvested) / totalInvested) * 100
      : 0;

    // 배당금 조회
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;

    const { data: dividends } = await supabase
      .from('dividends')
      .select('amount_krw, amount_usd, dividend_date')
      .eq('user_id', userId);

    let thisMonthDividend = 0;
    let yearlyDividend = 0;

    if (dividends) {
      for (const d of dividends) {
        const date = new Date(d.dividend_date);
        const amount = (d.amount_krw || 0) + (d.amount_usd || 0) * exchangeRate;

        if (date.getFullYear() === thisYear) {
          yearlyDividend += amount;
          if (date.getMonth() + 1 === thisMonth) {
            thisMonthDividend += amount;
          }
        }
      }
    }

    // 투자 일수 계산 (첫 입금일부터)
    const { data: firstDeposit } = await supabase
      .from('deposits')
      .select('deposit_date')
      .eq('user_id', userId)
      .eq('type', 'DEPOSIT')
      .order('deposit_date', { ascending: true })
      .limit(1)
      .single();

    let investmentDays = 0;
    if (firstDeposit) {
      const firstDate = new Date(firstDeposit.deposit_date);
      const today = new Date();
      investmentDays = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      totalAsset: Math.round(totalAsset),
      totalInvested: Math.round(totalInvested),
      totalProfit: Math.round(totalProfit),
      totalYield: Number(totalYield.toFixed(2)),
      thisMonthDividend: Math.round(thisMonthDividend),
      yearlyDividend: Math.round(yearlyDividend),
      investmentDays,
    };
  }

  async getPortfolio(userId: string): Promise<PortfolioItem[]> {
    const supabase = createServiceClient();

    // holdings 테이블에서 보유종목 조회
    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId);

    if (!holdings || holdings.length === 0) {
      return [];
    }

    // 현재가 조회
    const tickers = holdings.map((h) => h.ticker);
    const prices = await getStockPrices(tickers);

    // 환율 조회
    const exchangeRate = await getUSDKRWRate();

    // 포트폴리오 아이템 생성
    const portfolio: PortfolioItem[] = [];
    let totalValueKRW = 0;

    for (const holding of holdings) {
      const priceData = prices.get(holding.ticker);
      const currentPrice = priceData?.price || holding.avg_price || 0;
      const currency = (holding.currency as 'KRW' | 'USD') || (isKoreanStock(holding.ticker) ? 'KRW' : 'USD');

      const quantity = holding.quantity || 0;
      const avgPrice = holding.avg_price || 0;
      const totalValue = currentPrice * quantity;
      const invested = avgPrice * quantity;
      const profit = totalValue - invested;
      const profitPercent = invested > 0 ? (profit / invested) * 100 : 0;

      // KRW 환산 총액 (비중 계산용)
      const rate = currency === 'USD' ? exchangeRate : 1;
      totalValueKRW += totalValue * rate;

      portfolio.push({
        ticker: holding.ticker,
        name: holding.name || holding.ticker,
        quantity,
        avgPrice,
        currentPrice,
        totalValue,
        profit,
        profitPercent: Number(profitPercent.toFixed(2)),
        currency,
      });
    }

    // 비중 계산
    for (const item of portfolio) {
      const rate = item.currency === 'USD' ? exchangeRate : 1;
      const valueKRW = item.totalValue * rate;
      item.weight = totalValueKRW > 0
        ? Number(((valueKRW / totalValueKRW) * 100).toFixed(2))
        : 0;
    }

    // 현재가 캐시 업데이트
    await this.updatePriceCache(userId, portfolio);

    return portfolio;
  }

  private async updatePriceCache(userId: string, portfolio: PortfolioItem[]): Promise<void> {
    const supabase = createServiceClient();

    const updates = portfolio.map((item) => ({
      user_id: userId,
      ticker: item.ticker,
      current_price: item.currentPrice,
      currency: item.currency,
      updated_at: new Date().toISOString(),
    }));

    if (updates.length > 0) {
      await supabase
        .from('portfolio_cache')
        .upsert(updates, { onConflict: 'user_id,ticker' });
    }
  }

  async getDividends(userId: string, year?: number): Promise<DividendRecord[]> {
    const supabase = createServiceClient();

    let query = supabase
      .from('dividends')
      .select('*')
      .eq('user_id', userId)
      .order('dividend_date', { ascending: false });

    if (year) {
      query = query
        .gte('dividend_date', `${year}-01-01`)
        .lte('dividend_date', `${year}-12-31`);
    }

    const { data } = await query;

    return (data || []).map((d) => ({
      id: d.id,
      ticker: d.ticker,
      name: d.name || d.ticker,
      amountKRW: d.amount_krw || 0,
      amountUSD: d.amount_usd || 0,
      date: d.dividend_date,
    }));
  }

  async saveDividend(userId: string, dividend: DividendRecord): Promise<boolean> {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('dividends')
      .insert({
        user_id: userId,
        ticker: dividend.ticker,
        name: dividend.name,
        amount_krw: dividend.amountKRW,
        amount_usd: dividend.amountUSD,
        dividend_date: dividend.date,
        sheet_synced: false, // Standalone 모드이므로 false
      });

    if (error) {
      console.error('[StandaloneProvider] saveDividend error:', error);
      return false;
    }

    return true;
  }

  async deleteDividend(userId: string, dividend: DividendRecord): Promise<boolean> {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('dividends')
      .delete()
      .eq('user_id', userId)
      .eq('ticker', dividend.ticker)
      .eq('dividend_date', dividend.date)
      .eq('amount_krw', dividend.amountKRW)
      .eq('amount_usd', dividend.amountUSD);

    if (error) {
      console.error('[StandaloneProvider] deleteDividend error:', error);
      return false;
    }

    return true;
  }

  async getDeposits(userId: string): Promise<DepositRecord[]> {
    const supabase = createServiceClient();

    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('deposit_date', { ascending: false });

    return (data || []).map((d) => ({
      id: d.id,
      type: d.type as 'DEPOSIT' | 'WITHDRAW',
      amount: d.amount || 0,
      date: d.deposit_date,
      memo: d.memo || undefined,
    }));
  }

  async saveDeposit(userId: string, deposit: DepositRecord): Promise<boolean> {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        type: deposit.type,
        amount: deposit.amount,
        currency: 'KRW',
        deposit_date: deposit.date,
        memo: deposit.memo || null,
        sheet_synced: false, // Standalone 모드이므로 false
      });

    if (error) {
      console.error('[StandaloneProvider] saveDeposit error:', error);
      return false;
    }

    return true;
  }

  async deleteDeposit(userId: string, deposit: DepositRecord): Promise<boolean> {
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('deposits')
      .delete()
      .eq('user_id', userId)
      .eq('type', deposit.type)
      .eq('amount', deposit.amount)
      .eq('deposit_date', deposit.date);

    if (error) {
      console.error('[StandaloneProvider] deleteDeposit error:', error);
      return false;
    }

    return true;
  }

  /**
   * 주요 지수 수익률 비교 데이터 조회 (YTD 기준)
   * - KOSPI, S&P500 (SPY), NASDAQ (QQQ) 지수 데이터
   * - 포트폴리오 스냅샷 기반 계좌 수익률 계산
   */
  async getMajorIndexYieldComparison(userId: string): Promise<MajorIndexYieldComparisonData | null> {
    const supabase = createServiceClient();

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      // 연초 날짜 (1월 1일)
      const yearStart = `${currentYear}-01-01`;

      // 1. 포트폴리오 스냅샷 조회 (연초부터 현재까지)
      const { data: snapshots } = await supabase
        .from('portfolio_snapshots')
        .select('snapshot_date, total_asset, total_invested')
        .eq('user_id', userId)
        .gte('snapshot_date', yearStart)
        .order('snapshot_date', { ascending: true });

      // 2. 월별 레이블 생성
      const months = ['시작'];
      for (let m = 0; m <= currentMonth; m++) {
        months.push(`${m + 1}월`);
      }

      // 3. 현재 지수 데이터 조회
      const [kospiData, sp500Data, nasdaqData] = await Promise.all([
        getKOSPIIndex(),
        getSP500Index(),
        getNASDAQIndex(),
      ]);

      // 4. 지수 YTD 수익률 계산
      // 지수의 경우 연초 대비 현재 수익률을 사용
      // 현재 API에서는 일간 변동률만 제공하므로,
      // 실제 YTD는 추후 historical data API 연동 시 개선 가능
      // 임시로 현재 일간 변동률을 누적 형태로 표시
      const sp500Yields = this.generateMonthlyYields(sp500Data?.changePercent || 0, currentMonth + 1);
      const nasdaqYields = this.generateMonthlyYields(nasdaqData?.changePercent || 0, currentMonth + 1);
      const kospiYields = this.generateMonthlyYields(kospiData?.changePercent || 0, currentMonth + 1);

      // 5. 계좌 수익률 계산
      // null 값을 0으로 변환하여 타입 안정성 확보
      const normalizedSnapshots = (snapshots || []).map(s => ({
        snapshot_date: s.snapshot_date,
        total_asset: s.total_asset ?? 0,
        total_invested: s.total_invested ?? 0,
      }));
      const accountYields = this.calculateAccountYields(normalizedSnapshots, currentMonth + 1);

      // 지수 데이터가 하나라도 없으면 비교 차트를 표시하지 않음
      const hasAnyIndexData = kospiData || sp500Data || nasdaqData;

      console.log('[StandaloneProvider] Index comparison:', {
        kospi: kospiData?.changePercent ?? 'unavailable',
        sp500: sp500Data?.changePercent ?? 'unavailable',
        nasdaq: nasdaqData?.changePercent ?? 'unavailable',
        accountMonths: accountYields.length,
        hasAnyIndexData,
      });

      // 지수 데이터가 없으면 null 반환 (차트 미표시)
      if (!hasAnyIndexData) {
        console.warn('[StandaloneProvider] No index data available - skipping comparison chart');
        return null;
      }

      return {
        months,
        sp500: sp500Yields,
        nasdaq: nasdaqYields,
        kospi: kospiYields,
        account: accountYields,
      };
    } catch (error) {
      console.error('[StandaloneProvider] getMajorIndexYieldComparison error:', error);
      return null;
    }
  }

  /**
   * 월별 수익률 배열 생성 (시뮬레이션)
   * 실제 historical data가 없으므로 현재 수익률을 기반으로 추정
   */
  private generateMonthlyYields(currentYield: number, monthCount: number): number[] {
    const yields: number[] = [0]; // 시작점은 0%

    // 현재 수익률을 월별로 분배 (단순 선형)
    // 실제 historical API 연동 시 개선 필요
    for (let i = 1; i <= monthCount; i++) {
      // 현재까지의 누적 수익률 비율
      const ratio = i / monthCount;
      yields.push(Number((currentYield * ratio).toFixed(1)));
    }

    return yields;
  }

  /**
   * 포트폴리오 스냅샷 기반 월별 수익률 계산
   */
  private calculateAccountYields(
    snapshots: Array<{ snapshot_date: string; total_asset: number; total_invested: number }>,
    monthCount: number
  ): (number | null)[] {
    const yields: (number | null)[] = [0]; // 시작점은 0%

    if (snapshots.length === 0) {
      // 스냅샷이 없으면 null로 채움
      for (let i = 0; i < monthCount; i++) {
        yields.push(null);
      }
      return yields;
    }

    // 연초 자산 (첫 번째 스냅샷 기준)
    const firstSnapshot = snapshots[0];
    const startAsset = firstSnapshot?.total_asset || 0;
    const startInvested = firstSnapshot?.total_invested || 0;

    if (startAsset === 0) {
      for (let i = 0; i < monthCount; i++) {
        yields.push(null);
      }
      return yields;
    }

    // 월별로 그룹화
    const monthlySnapshots = new Map<number, typeof snapshots[0]>();
    for (const snapshot of snapshots) {
      const month = new Date(snapshot.snapshot_date).getMonth(); // 0-indexed
      // 각 월의 마지막 스냅샷 사용
      monthlySnapshots.set(month, snapshot);
    }

    // 월별 수익률 계산
    for (let m = 0; m < monthCount; m++) {
      const monthSnapshot = monthlySnapshots.get(m);
      if (!monthSnapshot) {
        yields.push(null);
        continue;
      }

      // 연초 대비 수익률: (현재자산 - 연초자산) / 연초자산 * 100
      // 또는 투자금 대비: (현재자산 - 투자금) / 투자금 * 100
      const asset = monthSnapshot.total_asset;
      const invested = monthSnapshot.total_invested;

      if (startInvested > 0) {
        // 연초 투자금 대비 수익률 계산
        const yieldPercent = ((asset - startInvested) / startInvested) * 100;
        yields.push(Number(yieldPercent.toFixed(1)));
      } else if (invested > 0) {
        // 현재 투자금 대비 수익률
        const yieldPercent = ((asset - invested) / invested) * 100;
        yields.push(Number(yieldPercent.toFixed(1)));
      } else {
        yields.push(null);
      }
    }

    return yields;
  }
}

// ============================================
// 프로바이더 팩토리
// ============================================

/**
 * 사용자 모드에 따라 적절한 데이터 프로바이더 반환
 */
export async function getDataProvider(userId: string): Promise<{
  provider: DataProvider;
  isStandalone: boolean;
}> {
  const supabase = createServiceClient();

  // 사용자 조회
  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('id', userId)
    .single();

  const isStandalone = !user?.spreadsheet_id;

  if (isStandalone) {
    return {
      provider: new StandaloneDataProvider(),
      isStandalone: true,
    };
  }

  // Sheet 모드: 기존 로직 사용 (별도 provider 클래스로 분리 가능)
  // 현재는 standalone provider만 구현하고, sheet 모드는 기존 action들 사용
  return {
    provider: new StandaloneDataProvider(), // fallback
    isStandalone: false,
  };
}

/**
 * 사용자가 Standalone 모드인지 확인
 */
export async function isStandaloneUser(userId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('id', userId)
    .single();

  return !user?.spreadsheet_id;
}

/**
 * 이메일로 사용자 모드 확인
 */
export async function isStandaloneUserByEmail(email: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('email', email)
    .single();

  return !user?.spreadsheet_id;
}
