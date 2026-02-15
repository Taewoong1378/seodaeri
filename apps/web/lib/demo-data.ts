/**
 * 데모 데이터 (Google Play Store 심사용)
 * - 테스트 계정(reviewer@seodaeri.com)에서 사용되는 샘플 데이터
 * - 실제 스프레드시트 연동 없이 앱 기능을 시연
 */

import type { DashboardData } from '../app/actions/dashboard';
import type {
  AccountTrendData,
  CumulativeDividendData,
  DividendAccountData,
  DividendByYearData,
  MajorIndexYieldComparisonData,
  MonthlyDividend,
  MonthlyProfitLoss,
  MonthlyYieldComparisonData,
  MonthlyYieldComparisonDollarAppliedData,
  PerformanceComparisonData,
  PortfolioItem,
  RollingAverageDividendData,
  YearlyDividendSummaryData,
  YieldComparisonData,
  YieldComparisonDollarData,
} from './google-sheets';

// =============================================================================
// 포트폴리오 데이터
// =============================================================================
export const DEMO_PORTFOLIO: PortfolioItem[] = [
  {
    ticker: 'AAPL',
    name: '애플',
    country: '미국',
    currency: 'USD',
    quantity: 50,
    avgPrice: 145 * 1450, // USD to KRW
    currentPrice: 178.5 * 1450,
    totalValue: 50 * 178.5 * 1450,
    profit: 50 * (178.5 - 145) * 1450,
    yieldPercent: ((178.5 - 145) / 145) * 100,
    weight: 15.2,
    rowIndex: 2,
  },
  {
    ticker: 'MSFT',
    name: '마이크로소프트',
    country: '미국',
    currency: 'USD',
    quantity: 30,
    avgPrice: 280 * 1450,
    currentPrice: 415 * 1450,
    totalValue: 30 * 415 * 1450,
    profit: 30 * (415 - 280) * 1450,
    yieldPercent: ((415 - 280) / 280) * 100,
    weight: 21.2,
    rowIndex: 3,
  },
  {
    ticker: 'NVDA',
    name: '엔비디아',
    country: '미국',
    currency: 'USD',
    quantity: 20,
    avgPrice: 450 * 1450,
    currentPrice: 875 * 1450,
    totalValue: 20 * 875 * 1450,
    profit: 20 * (875 - 450) * 1450,
    yieldPercent: ((875 - 450) / 450) * 100,
    weight: 29.8,
    rowIndex: 4,
  },
  {
    ticker: 'GOOGL',
    name: '알파벳',
    country: '미국',
    currency: 'USD',
    quantity: 25,
    avgPrice: 120 * 1450,
    currentPrice: 175 * 1450,
    totalValue: 25 * 175 * 1450,
    profit: 25 * (175 - 120) * 1450,
    yieldPercent: ((175 - 120) / 120) * 100,
    weight: 7.5,
    rowIndex: 5,
  },
  {
    ticker: '005930',
    name: '삼성전자',
    country: '한국',
    currency: 'KRW',
    quantity: 100,
    avgPrice: 65000,
    currentPrice: 72000,
    totalValue: 100 * 72000,
    profit: 100 * (72000 - 65000),
    yieldPercent: ((72000 - 65000) / 65000) * 100,
    weight: 12.3,
    rowIndex: 6,
  },
  {
    ticker: '000660',
    name: 'SK하이닉스',
    country: '한국',
    currency: 'KRW',
    quantity: 50,
    avgPrice: 120000,
    currentPrice: 185000,
    totalValue: 50 * 185000,
    profit: 50 * (185000 - 120000),
    yieldPercent: ((185000 - 120000) / 120000) * 100,
    weight: 14.0,
    rowIndex: 7,
  },
];

// =============================================================================
// 배당금 데이터
// =============================================================================
const generateDividendRecords = (): MonthlyDividend[] => {
  const records: MonthlyDividend[] = [];
  const now = new Date();

  // 지난 24개월 배당금 데이터 생성
  for (let i = 0; i < 24; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    // 월별 배당금 (변동폭 적용)
    const baseAmount = 150000 + Math.floor(Math.random() * 50000);

    records.push({
      month: String(date.getMonth() + 1).padStart(2, '0'),
      year: date.getFullYear(),
      amount: baseAmount,
    });
  }

  return records.reverse();
};

export const DEMO_MONTHLY_DIVIDENDS: MonthlyDividend[] = generateDividendRecords();

// 연도별 배당금 집계 (월별 데이터 with 연도 컬럼)
export const DEMO_DIVIDEND_BY_YEAR: DividendByYearData = {
  years: [2023, 2024, 2025],
  data: [
    { month: '1', '2023': 150000, '2024': 175000, '2025': 180000 },
    { month: '2', '2023': 145000, '2024': 180000, '2025': 0 },
    { month: '3', '2023': 155000, '2024': 185000, '2025': 0 },
    { month: '4', '2023': 160000, '2024': 170000, '2025': 0 },
    { month: '5', '2023': 148000, '2024': 195000, '2025': 0 },
    { month: '6', '2023': 152000, '2024': 182000, '2025': 0 },
    { month: '7', '2023': 158000, '2024': 178000, '2025': 0 },
    { month: '8', '2023': 163000, '2024': 190000, '2025': 0 },
    { month: '9', '2023': 155000, '2024': 185000, '2025': 0 },
    { month: '10', '2023': 162000, '2024': 192000, '2025': 0 },
    { month: '11', '2023': 168000, '2024': 188000, '2025': 0 },
    { month: '12', '2023': 172000, '2024': 195000, '2025': 0 },
  ],
};

// 연간 배당금 요약 (바 차트용)
export const DEMO_YEARLY_DIVIDEND_SUMMARY: YearlyDividendSummaryData = {
  data: [
    { year: '2023년', amount: 1888000 },
    { year: '2024년', amount: 2215000 },
    { year: '2025년', amount: 180000 },
  ],
};

// 롤링 평균 배당금 (12개월 평균)
export const DEMO_ROLLING_AVERAGE_DIVIDEND: RollingAverageDividendData = {
  data: DEMO_MONTHLY_DIVIDENDS.slice(-12).map((d, i, arr) => {
    const sum = arr.slice(0, i + 1).reduce((acc, cur) => acc + cur.amount, 0);
    const year = d.year % 100; // 2024 -> 24
    return {
      month: `${year}.${d.month}`,
      average: Math.round(sum / (i + 1)),
    };
  }),
};

// 누적 배당금
export const DEMO_CUMULATIVE_DIVIDEND: CumulativeDividendData = {
  data: DEMO_MONTHLY_DIVIDENDS.reduce(
    (acc: { month: string; cumulative: number }[], d) => {
      const prev = acc.length > 0 ? acc[acc.length - 1]?.cumulative || 0 : 0;
      const year = d.year % 100;
      acc.push({
        month: `${year}.${d.month}`,
        cumulative: prev + d.amount,
      });
      return acc;
    },
    []
  ),
};

// =============================================================================
// 계좌 추세 데이터
// =============================================================================
const generateAccountTrend = (): AccountTrendData[] => {
  const data: AccountTrendData[] = [];
  const now = new Date();
  let cumulativeDeposit = 0;
  let accountValue = 0;

  // 지난 18개월 데이터 생성
  for (let i = 17; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    // 월별 입금 (매월 500~800만원)
    const monthlyDeposit = 5000000 + Math.floor(Math.random() * 3000000);
    cumulativeDeposit += monthlyDeposit;

    // 계좌 수익률 변동 (기준 입금액 대비 -5% ~ +25%)
    const yieldRate = 0.95 + Math.random() * 0.3 + (17 - i) * 0.01;
    accountValue = Math.round(cumulativeDeposit * yieldRate);

    // date format: "YY.MM"
    const year = date.getFullYear() % 100;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    data.push({
      date: `${year}.${month}`,
      totalAccount: accountValue,
      cumulativeDeposit,
    });
  }

  return data;
};

export const DEMO_ACCOUNT_TREND: AccountTrendData[] = generateAccountTrend();

// =============================================================================
// 수익률 비교 데이터
// =============================================================================
export const DEMO_PERFORMANCE_COMPARISON: PerformanceComparisonData[] = [
  { date: '24.01', portfolio: 0, kospi: 0, sp500: 0, nasdaq: 0 },
  { date: '24.02', portfolio: 2.5, kospi: 1.2, sp500: 3.1, nasdaq: 4.5 },
  { date: '24.03', portfolio: 5.8, kospi: -0.2, sp500: 6.2, nasdaq: 8.3 },
  { date: '24.04', portfolio: 3.2, kospi: -2.5, sp500: 4.5, nasdaq: 5.8 },
  { date: '24.05', portfolio: 8.5, kospi: 2.3, sp500: 8.9, nasdaq: 12.4 },
  { date: '24.06', portfolio: 12.3, kospi: 3.8, sp500: 12.5, nasdaq: 18.2 },
  { date: '24.07', portfolio: 10.8, kospi: 1.2, sp500: 11.2, nasdaq: 15.6 },
  { date: '24.08', portfolio: 15.2, kospi: 4.5, sp500: 14.8, nasdaq: 20.3 },
  { date: '24.09', portfolio: 18.5, kospi: 2.8, sp500: 16.2, nasdaq: 22.5 },
  { date: '24.10', portfolio: 16.2, kospi: 0.5, sp500: 15.5, nasdaq: 20.8 },
  { date: '24.11', portfolio: 20.5, kospi: 3.2, sp500: 18.9, nasdaq: 25.6 },
  { date: '24.12', portfolio: 18.5, kospi: 1.8, sp500: 17.2, nasdaq: 23.2 },
];

// 월별 손익 (profit은 수익, loss는 손실 절대값)
export const DEMO_MONTHLY_PROFIT_LOSS: MonthlyProfitLoss[] = [
  { month: '1월', profit: 1250000, loss: 0 },
  { month: '2월', profit: 1650000, loss: 0 },
  { month: '3월', profit: 0, loss: 1320000 },
  { month: '4월', profit: 2640000, loss: 0 },
  { month: '5월', profit: 1890000, loss: 0 },
  { month: '6월', profit: 0, loss: 750000 },
  { month: '7월', profit: 2200000, loss: 0 },
  { month: '8월', profit: 1650000, loss: 0 },
  { month: '9월', profit: 0, loss: 1100000 },
  { month: '10월', profit: 2150000, loss: 0 },
  { month: '11월', profit: 0, loss: 980000 },
  { month: '12월', profit: 1420000, loss: 0 },
];

// 수익률 비교 (바 차트)
export const DEMO_YIELD_COMPARISON: YieldComparisonData = {
  thisYearYield: {
    account: 18.5,
    kospi: 1.8,
    sp500: 17.2,
    nasdaq: 23.2,
  },
  annualizedYield: {
    account: 15.8,
    kospi: 3.2,
    sp500: 12.5,
    nasdaq: 15.1,
  },
};

// 수익률 비교 (달러환율 적용)
export const DEMO_YIELD_COMPARISON_DOLLAR: YieldComparisonDollarData = {
  thisYearYield: {
    account: 18.5,
    kospi: 1.8,
    sp500: 19.5,
    nasdaq: 25.8,
    dollar: 5.2,
  },
  annualizedYield: {
    account: 15.8,
    kospi: 3.2,
    sp500: 14.2,
    nasdaq: 17.5,
    dollar: 4.1,
  },
};

// 월별 수익률 비교
export const DEMO_MONTHLY_YIELD_COMPARISON: MonthlyYieldComparisonData = {
  currentMonthYield: {
    account: 2.5,
    kospi: 0.8,
    sp500: 1.9,
    nasdaq: 2.8,
    dollar: 0.3,
  },
  thisYearYield: {
    account: 18.5,
    kospi: 1.8,
    sp500: 17.2,
    nasdaq: 23.2,
    dollar: 5.2,
  },
  currentMonth: '1월',
};

// 월별 수익률 비교 (환율 적용)
export const DEMO_MONTHLY_YIELD_COMPARISON_DOLLAR_APPLIED: MonthlyYieldComparisonDollarAppliedData = {
  currentMonthYield: {
    account: 2.5,
    kospi: 0.8,
    sp500: 2.1,
    nasdaq: 3.0,
  },
  thisYearYield: {
    account: 18.5,
    kospi: 1.8,
    sp500: 19.5,
    nasdaq: 25.8,
  },
  currentMonth: '1월',
};

// 주요지수 수익률 비교 (라인차트)
export const DEMO_MAJOR_INDEX_YIELD_COMPARISON: MajorIndexYieldComparisonData = {
  months: ['시작', ...DEMO_PERFORMANCE_COMPARISON.map((d) => d.date.split('.')[1] + '월')],
  account: [0, ...DEMO_PERFORMANCE_COMPARISON.map((d) => d.portfolio)],
  kospi: [0, ...DEMO_PERFORMANCE_COMPARISON.map((d) => d.kospi)],
  sp500: [0, ...DEMO_PERFORMANCE_COMPARISON.map((d) => d.sp500)],
  nasdaq: [0, ...DEMO_PERFORMANCE_COMPARISON.map((d) => d.nasdaq)],
  // 추가 시장 지표 데모 데이터
  gold: [0, 2.1, 4.5, 7.2, 5.8, 8.3, 10.1, 9.5, 12.8, 11.2, 14.5, 13.8, 15.2],
  bitcoin: [0, 5.2, -3.1, 12.5, 8.7, 15.3, 22.1, 18.5, 25.8, 20.3, 28.5, 35.2, 30.1],
  realEstate: [0, 0.2, 0.5, 0.8, 1.0, 1.3, 1.5, 1.8, 2.0, 2.2, 2.5, 2.8, 3.0],
  dollar: [0, 1.2, 2.5, 1.8, 3.2, 2.8, 4.1, 3.5, 5.2, 4.8, 3.9, 4.5, 5.0],
};

// =============================================================================
// 입금/출금 데이터
// =============================================================================
export interface DemoDeposit {
  date: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  memo: string;
  account: string;
}

export const DEMO_DEPOSITS: DemoDeposit[] = [
  { date: '2024-01-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-02-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-03-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-04-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-05-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-05-20', type: 'DEPOSIT', amount: 5000000, memo: '보너스', account: '키움증권' },
  { date: '2024-06-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-07-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-08-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-08-25', type: 'WITHDRAW', amount: 3000000, memo: '비상금 출금', account: '키움증권' },
  { date: '2024-09-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-10-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-11-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
  { date: '2024-11-20', type: 'DEPOSIT', amount: 8000000, memo: '연말 보너스', account: '키움증권' },
  { date: '2024-12-15', type: 'DEPOSIT', amount: 10000000, memo: '월급', account: '키움증권' },
];

// 총 입금액 계산
export const DEMO_TOTAL_DEPOSIT = DEMO_DEPOSITS.reduce((acc, d) => {
  return d.type === 'DEPOSIT' ? acc + d.amount : acc - d.amount;
}, 0);

// =============================================================================
// 배당금 거래내역 (TransactionsClient용)
// =============================================================================
export interface DemoDividendTransaction {
  date: string;
  ticker: string;
  name: string;
  amountKRW: number;
  amountUSD: number;
}

export const DEMO_DIVIDEND_TRANSACTIONS: DemoDividendTransaction[] = [
  { date: '2025-01-10', ticker: 'AAPL', name: '애플', amountKRW: 35000, amountUSD: 24.14 },
  { date: '2024-12-10', ticker: 'MSFT', name: '마이크로소프트', amountKRW: 32850, amountUSD: 22.66 },
  { date: '2024-12-05', ticker: 'AAPL', name: '애플', amountKRW: 34800, amountUSD: 24.00 },
  { date: '2024-11-20', ticker: 'NVDA', name: '엔비디아', amountKRW: 2900, amountUSD: 2.00 },
  { date: '2024-11-15', ticker: 'GOOGL', name: '알파벳', amountKRW: 14500, amountUSD: 10.00 },
  { date: '2024-11-05', ticker: 'AAPL', name: '애플', amountKRW: 34800, amountUSD: 24.00 },
  { date: '2024-10-20', ticker: '005930', name: '삼성전자', amountKRW: 50000, amountUSD: 34.48 },
  { date: '2024-10-15', ticker: 'MSFT', name: '마이크로소프트', amountKRW: 32850, amountUSD: 22.66 },
  { date: '2024-10-10', ticker: 'AAPL', name: '애플', amountKRW: 34800, amountUSD: 24.00 },
  { date: '2024-09-25', ticker: '000660', name: 'SK하이닉스', amountKRW: 25000, amountUSD: 17.24 },
  { date: '2024-09-15', ticker: 'NVDA', name: '엔비디아', amountKRW: 2900, amountUSD: 2.00 },
  { date: '2024-09-05', ticker: 'AAPL', name: '애플', amountKRW: 34800, amountUSD: 24.00 },
  { date: '2024-08-20', ticker: 'GOOGL', name: '알파벳', amountKRW: 14500, amountUSD: 10.00 },
  { date: '2024-08-15', ticker: 'MSFT', name: '마이크로소프트', amountKRW: 32850, amountUSD: 22.66 },
  { date: '2024-08-10', ticker: 'AAPL', name: '애플', amountKRW: 34800, amountUSD: 24.00 },
  { date: '2024-07-25', ticker: '005930', name: '삼성전자', amountKRW: 50000, amountUSD: 34.48 },
  { date: '2024-07-15', ticker: 'NVDA', name: '엔비디아', amountKRW: 2900, amountUSD: 2.00 },
  { date: '2024-07-05', ticker: 'AAPL', name: '애플', amountKRW: 34800, amountUSD: 24.00 },
  { date: '2024-06-20', ticker: 'MSFT', name: '마이크로소프트', amountKRW: 32850, amountUSD: 22.66 },
  { date: '2024-06-15', ticker: 'GOOGL', name: '알파벳', amountKRW: 14500, amountUSD: 10.00 },
];

// =============================================================================
// 전체 대시보드 데이터
// =============================================================================

// 총 자산 계산 (포트폴리오 평가액 합계)
const totalAsset = DEMO_PORTFOLIO.reduce((acc, item) => acc + item.totalValue, 0);

// 총 투자금 계산
const totalInvested = DEMO_PORTFOLIO.reduce(
  (acc, item) => acc + item.avgPrice * item.quantity,
  0
);

// 총 수익 계산
const totalProfit = totalAsset - totalInvested;

// 총 수익률 계산
const totalYield = (totalProfit / totalInvested) * 100;

// 이번달 배당금
const thisMonthDividend =
  DEMO_MONTHLY_DIVIDENDS[DEMO_MONTHLY_DIVIDENDS.length - 1]?.amount || 0;

// 올해 배당금
const currentYear = new Date().getFullYear();
const yearlyDividend = DEMO_MONTHLY_DIVIDENDS.filter((d) =>
  d.year === currentYear
).reduce((acc, d) => acc + d.amount, 0);

// =============================================================================
// 계좌 유형별 배당금 데이터
// =============================================================================
const DEMO_GENERAL_MONTHLY_DIVIDENDS: MonthlyDividend[] = DEMO_MONTHLY_DIVIDENDS.map(d => ({
  ...d,
  amount: Math.round(d.amount * 0.6),
}));

const DEMO_TAXSAVING_MONTHLY_DIVIDENDS: MonthlyDividend[] = DEMO_MONTHLY_DIVIDENDS.map(d => ({
  ...d,
  amount: Math.round(d.amount * 0.4),
}));

const DEMO_DIVIDEND_BY_ACCOUNT: { general: DividendAccountData; taxSaving: DividendAccountData } = {
  general: {
    thisMonthDividend: Math.round((DEMO_MONTHLY_DIVIDENDS[DEMO_MONTHLY_DIVIDENDS.length - 1]?.amount || 0) * 0.6),
    yearlyDividend: Math.round(yearlyDividend * 0.6),
    monthlyDividends: DEMO_GENERAL_MONTHLY_DIVIDENDS,
    dividendByYear: {
      years: DEMO_DIVIDEND_BY_YEAR.years,
      data: DEMO_DIVIDEND_BY_YEAR.data.map(d => {
        const scaled: { [year: string]: string | number; month: string } = { month: d.month };
        for (const year of DEMO_DIVIDEND_BY_YEAR.years) {
          scaled[String(year)] = Math.round(((d as any)[String(year)] || 0) * 0.6);
        }
        return scaled;
      }),
    },
    yearlyDividendSummary: {
      data: DEMO_YEARLY_DIVIDEND_SUMMARY.data.map(d => ({
        year: d.year,
        amount: Math.round(d.amount * 0.6),
      })),
    },
    rollingAverageDividend: {
      data: DEMO_ROLLING_AVERAGE_DIVIDEND.data.map(d => ({
        month: d.month,
        average: Math.round(d.average * 0.6),
      })),
    },
    cumulativeDividend: {
      data: DEMO_CUMULATIVE_DIVIDEND.data.map(d => ({
        month: d.month,
        cumulative: Math.round(d.cumulative * 0.6),
      })),
    },
  },
  taxSaving: {
    thisMonthDividend: Math.round((DEMO_MONTHLY_DIVIDENDS[DEMO_MONTHLY_DIVIDENDS.length - 1]?.amount || 0) * 0.4),
    yearlyDividend: Math.round(yearlyDividend * 0.4),
    monthlyDividends: DEMO_TAXSAVING_MONTHLY_DIVIDENDS,
    dividendByYear: {
      years: DEMO_DIVIDEND_BY_YEAR.years,
      data: DEMO_DIVIDEND_BY_YEAR.data.map(d => {
        const scaled: { [year: string]: string | number; month: string } = { month: d.month };
        for (const year of DEMO_DIVIDEND_BY_YEAR.years) {
          scaled[String(year)] = Math.round(((d as any)[String(year)] || 0) * 0.4);
        }
        return scaled;
      }),
    },
    yearlyDividendSummary: {
      data: DEMO_YEARLY_DIVIDEND_SUMMARY.data.map(d => ({
        year: d.year,
        amount: Math.round(d.amount * 0.4),
      })),
    },
    rollingAverageDividend: {
      data: DEMO_ROLLING_AVERAGE_DIVIDEND.data.map(d => ({
        month: d.month,
        average: Math.round(d.average * 0.4),
      })),
    },
    cumulativeDividend: {
      data: DEMO_CUMULATIVE_DIVIDEND.data.map(d => ({
        month: d.month,
        cumulative: Math.round(d.cumulative * 0.4),
      })),
    },
  },
};

// 투자 일수 (첫 입금일로부터 계산)
const firstDepositDate = new Date(DEMO_DEPOSITS[0]?.date || new Date());
const investmentDays = Math.floor(
  (Date.now() - firstDepositDate.getTime()) / (1000 * 60 * 60 * 24)
);

/**
 * 데모 대시보드 데이터
 * - getDashboardData() 대신 사용
 */
export const DEMO_DASHBOARD_DATA: DashboardData = {
  // 계좌 요약
  totalAsset,
  totalYield,
  totalInvested,
  totalProfit,

  // 배당 데이터
  thisMonthDividend,
  yearlyDividend,
  monthlyDividends: DEMO_MONTHLY_DIVIDENDS,
  dividendByYear: DEMO_DIVIDEND_BY_YEAR,
  yearlyDividendSummary: DEMO_YEARLY_DIVIDEND_SUMMARY,
  rollingAverageDividend: DEMO_ROLLING_AVERAGE_DIVIDEND,
  cumulativeDividend: DEMO_CUMULATIVE_DIVIDEND,
  dividendByAccount: DEMO_DIVIDEND_BY_ACCOUNT,

  // 포트폴리오
  portfolio: DEMO_PORTFOLIO,

  // 수익률 비교
  performanceComparison: DEMO_PERFORMANCE_COMPARISON,
  accountTrend: DEMO_ACCOUNT_TREND,
  monthlyProfitLoss: DEMO_MONTHLY_PROFIT_LOSS,

  // 수익률 비교 차트
  yieldComparison: DEMO_YIELD_COMPARISON,
  yieldComparisonDollar: DEMO_YIELD_COMPARISON_DOLLAR,
  monthlyYieldComparison: DEMO_MONTHLY_YIELD_COMPARISON,
  monthlyYieldComparisonDollarApplied: DEMO_MONTHLY_YIELD_COMPARISON_DOLLAR_APPLIED,
  majorIndexYieldComparison: DEMO_MAJOR_INDEX_YIELD_COMPARISON,

  // 기타
  investmentDays,
  lastSyncAt: new Date().toISOString(),
};

/**
 * 테스트 계정 여부 확인 헬퍼
 */
export function isDemoAccount(email: string | null | undefined): boolean {
  return email === 'reviewer@seodaeri.com';
}
