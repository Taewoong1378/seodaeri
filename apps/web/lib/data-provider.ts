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
