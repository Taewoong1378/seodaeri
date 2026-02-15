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
import type { AccountTrendData, MajorIndexYieldComparisonData, MonthlyProfitLoss } from './google-sheets';
import type { HistoricalMarketData } from './historical-exchange-rate';
import { calculateMarketYields } from './exchange-rate-enrichment';

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
  account?: string;
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

    let totalAsset = 0;
    let totalInvested = 0;
    const exchangeRate = await getUSDKRWRate();

    // 1) account_balances + deposits 우선 조회
    const { data: accountBalances } = await (supabase as any)
      .from('account_balances')
      .select('year_month, balance')
      .eq('user_id', userId)
      .order('year_month', { ascending: false });

    if (accountBalances && accountBalances.length > 0) {
      // 최신 잔액 = totalAsset
      totalAsset = accountBalances[0].balance || 0;

      // deposits에서 순입금액 계산 = totalInvested
      const { data: deposits } = await supabase
        .from('deposits')
        .select('type, amount')
        .eq('user_id', userId);

      if (deposits && deposits.length > 0) {
        for (const d of deposits) {
          if (d.type === 'DEPOSIT') {
            totalInvested += d.amount || 0;
          } else if (d.type === 'WITHDRAW') {
            totalInvested -= d.amount || 0;
          }
        }
      }
    } else {
      // 2) fallback: holdings 기반 계산 (기존 로직)
      const portfolio = await this.getPortfolio(userId);

      for (const item of portfolio) {
        const rate = item.currency === 'USD' ? exchangeRate : 1;
        totalAsset += item.totalValue * rate;
        totalInvested += item.avgPrice * item.quantity * rate;
      }
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
      account: d.account || undefined,
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
   * 계좌 추세 데이터 조회 (account_balances + deposits)
   * Sheet 모드의 parseAccountTrendData()와 동일한 출력 형태
   */
  async getAccountTrend(userId: string): Promise<AccountTrendData[]> {
    const supabase = createServiceClient();

    // account_balances 조회 (시간순)
    const { data: balances } = await (supabase as any)
      .from('account_balances')
      .select('year_month, balance')
      .eq('user_id', userId)
      .order('year_month', { ascending: true });

    if (!balances || balances.length === 0) {
      return [];
    }

    // deposits 조회 (시간순)
    const { data: deposits } = await supabase
      .from('deposits')
      .select('type, amount, deposit_date')
      .eq('user_id', userId)
      .order('deposit_date', { ascending: true });

    // 월별 순입금액 계산
    const monthlyNetDeposit = new Map<string, number>();
    if (deposits) {
      for (const d of deposits) {
        const date = new Date(d.deposit_date);
        const ym = `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyNetDeposit.get(ym) || 0;
        const amount = d.type === 'DEPOSIT' ? (d.amount || 0) : -(d.amount || 0);
        monthlyNetDeposit.set(ym, current + amount);
      }
    }

    // AccountTrendData 생성
    const result: AccountTrendData[] = [];
    let cumulativeDeposit = 0;

    for (const b of balances) {
      // year_month: "2025-01" → "25.01"
      const parts = (b.year_month as string).split('-');
      const date = `${(parts[0] || '').slice(2)}.${parts[1] || ''}`;

      // 누적 입금액 갱신
      const netDeposit = monthlyNetDeposit.get(date) || 0;
      cumulativeDeposit += netDeposit;

      result.push({
        date,
        totalAccount: b.balance || 0,
        cumulativeDeposit: Math.round(cumulativeDeposit),
      });
    }

    return result;
  }

  /**
   * 월별 손익 데이터 조회 (account_balances 기반)
   * 순손익 = (이번달 잔액 - 지난달 잔액) - (이번달 순입금액)
   */
  async getMonthlyProfitLoss(userId: string): Promise<MonthlyProfitLoss[]> {
    const supabase = createServiceClient();

    // 올해 account_balances 조회
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearPrefix = `${currentYear}-`;

    const { data: balances } = await (supabase as any)
      .from('account_balances')
      .select('year_month, balance')
      .eq('user_id', userId)
      .like('year_month', `${yearPrefix}%`)
      .order('year_month', { ascending: true });

    if (!balances || balances.length === 0) {
      return [];
    }

    // 올해 deposits 조회
    const { data: deposits } = await supabase
      .from('deposits')
      .select('type, amount, deposit_date')
      .eq('user_id', userId)
      .gte('deposit_date', `${currentYear}-01-01`)
      .lte('deposit_date', `${currentYear}-12-31`);

    // 월별 순입금액 계산
    const monthlyNetDeposit = new Map<number, number>();
    if (deposits) {
      for (const d of deposits) {
        const month = new Date(d.deposit_date).getMonth() + 1;
        const current = monthlyNetDeposit.get(month) || 0;
        const amount = d.type === 'DEPOSIT' ? (d.amount || 0) : -(d.amount || 0);
        monthlyNetDeposit.set(month, current + amount);
      }
    }

    // 월별 잔액 맵
    const monthlyBalance = new Map<number, number>();
    for (const b of balances) {
      const month = Number.parseInt((b.year_month as string).split('-')[1] || '0', 10);
      monthlyBalance.set(month, b.balance || 0);
    }

    // 이전달 잔액 (작년 12월) 조회
    let prevBalance = 0;
    const { data: prevYear } = await (supabase as any)
      .from('account_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('year_month', `${currentYear - 1}-12`)
      .single();
    if (prevYear) {
      prevBalance = prevYear.balance || 0;
    }

    // MonthlyProfitLoss 생성
    const result: MonthlyProfitLoss[] = [];
    let lastBalance = prevBalance;

    for (let m = 1; m <= 12; m++) {
      const balance = monthlyBalance.get(m);
      if (balance === undefined) {
        // 데이터 없는 달은 건너뛰기 (lastBalance는 유지)
        continue;
      }

      const netDeposit = monthlyNetDeposit.get(m) || 0;
      const netPL = (balance - lastBalance) - netDeposit;

      result.push({
        month: `${m}월`,
        profit: netPL > 0 ? Math.round(netPL) : 0,
        loss: netPL < 0 ? Math.round(Math.abs(netPL)) : 0,
      });

      lastBalance = balance;
    }

    return result;
  }

  /**
   * 주요 지수 수익률 비교 데이터 조회 (YTD 기준)
   * 공개 스프레드시트의 historical market data를 사용하여
   * Sheet 모드와 동일한 실제 YTD 수익률을 계산
   */
  async getMajorIndexYieldComparison(userId: string, historicalRates?: Map<string, number>, marketData?: HistoricalMarketData): Promise<MajorIndexYieldComparisonData | null> {
    const supabase = createServiceClient();

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      // 1. 월별 레이블 생성
      const months = ['시작'];
      for (let m = 0; m <= currentMonth; m++) {
        months.push(`${m + 1}월`);
      }

      // 2. 시장 데이터에서 모든 수익률 계산 (KOSPI, S&P500, NASDAQ, 달러, 금, BTC, 부동산)
      if (!marketData) {
        console.warn('[StandaloneProvider] No market data available - skipping comparison chart');
        return null;
      }

      const marketYields = calculateMarketYields(months, marketData, currentYear);

      // 지수 데이터 유효성 확인 (하나라도 있어야 차트 표시)
      const hasKospi = marketYields.kospi.some(v => v !== 0);
      const hasSP500 = marketYields.sp500.some(v => v !== 0);
      const hasNasdaq = marketYields.nasdaq.some(v => v !== 0);

      if (!hasKospi && !hasSP500 && !hasNasdaq) {
        console.warn('[StandaloneProvider] No index data in market data - skipping comparison chart');
        return null;
      }

      // 3. 계좌 수익률 계산 (포트폴리오 스냅샷 기반)
      const yearStart = `${currentYear}-01-01`;
      const { data: snapshots } = await supabase
        .from('portfolio_snapshots')
        .select('snapshot_date, total_asset, total_invested')
        .eq('user_id', userId)
        .gte('snapshot_date', yearStart)
        .order('snapshot_date', { ascending: true });

      const normalizedSnapshots = (snapshots || []).map(s => ({
        snapshot_date: s.snapshot_date,
        total_asset: s.total_asset ?? 0,
        total_invested: s.total_invested ?? 0,
      }));
      const accountYields = this.calculateAccountYields(normalizedSnapshots, currentMonth + 1);

      console.log('[StandaloneProvider] Index comparison (historical):', {
        kospiYTD: marketYields.kospi[marketYields.kospi.length - 1],
        sp500YTD: marketYields.sp500[marketYields.sp500.length - 1],
        nasdaqYTD: marketYields.nasdaq[marketYields.nasdaq.length - 1],
        dollarYTD: marketYields.dollar[marketYields.dollar.length - 1],
      });

      return {
        months,
        sp500: marketYields.sp500,
        nasdaq: marketYields.nasdaq,
        kospi: marketYields.kospi,
        account: accountYields,
        sp500Dollar: marketYields.sp500Dollar,
        nasdaqDollar: marketYields.nasdaqDollar,
        dollar: marketYields.dollar,
        gold: marketYields.gold,
        bitcoin: marketYields.bitcoin,
        realEstate: marketYields.realEstate,
      };
    } catch (error) {
      console.error('[StandaloneProvider] getMajorIndexYieldComparison error:', error);
      return null;
    }
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
