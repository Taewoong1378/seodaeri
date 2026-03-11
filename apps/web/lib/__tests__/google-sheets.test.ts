import { describe, expect, it, vi } from 'vitest'
import {
  aggregateDividendsByYear,
  aggregateMonthlyDividends,
  aggregateYearlyDividends,
  calculateCumulativeDividend,
  calculateRollingAverageDividend,
  parseAccountSummary,
  parseMonthlyProfitLoss,
  parsePortfolioData,
} from '../google-sheets'
import type { DividendRecord } from '../google-sheets'

vi.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: vi.fn() },
    sheets: vi.fn(),
    drive: vi.fn(),
  },
}))

// ============================================
// aggregateMonthlyDividends
// ============================================

describe('aggregateMonthlyDividends', () => {
  it('sums amounts for multiple dividends in the same month', () => {
    const dividends: DividendRecord[] = [
      {
        date: '2024-03-05',
        ticker: 'AAPL',
        name: 'Apple',
        amountKRW: 0,
        amountUSD: 5,
        totalKRW: 6500,
      },
      {
        date: '2024-03-20',
        ticker: 'MSFT',
        name: 'Microsoft',
        amountKRW: 0,
        amountUSD: 3,
        totalKRW: 3900,
      },
    ]
    const result = aggregateMonthlyDividends(dividends)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ month: '3월', year: 2024, amount: 10400 })
  })

  it('creates separate entries for different months', () => {
    const dividends: DividendRecord[] = [
      {
        date: '2024-01-10',
        ticker: 'AAPL',
        name: 'Apple',
        amountKRW: 0,
        amountUSD: 5,
        totalKRW: 6500,
      },
      {
        date: '2024-02-10',
        ticker: 'MSFT',
        name: 'Microsoft',
        amountKRW: 0,
        amountUSD: 3,
        totalKRW: 3900,
      },
    ]
    const result = aggregateMonthlyDividends(dividends)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ month: '1월', year: 2024 })
    expect(result[1]).toMatchObject({ month: '2월', year: 2024 })
  })

  it('returns an empty array for empty dividends', () => {
    expect(aggregateMonthlyDividends([])).toEqual([])
  })

  it('skips records with an invalid date', () => {
    const dividends: DividendRecord[] = [
      {
        date: 'not-a-date',
        ticker: 'AAPL',
        name: 'Apple',
        amountKRW: 0,
        amountUSD: 5,
        totalKRW: 6500,
      },
      {
        date: '2024-05-15',
        ticker: 'MSFT',
        name: 'Microsoft',
        amountKRW: 0,
        amountUSD: 3,
        totalKRW: 3900,
      },
    ]
    const result = aggregateMonthlyDividends(dividends)
    expect(result).toHaveLength(1)
    expect(result[0]?.month).toBe('5월')
  })

  it('sorts results by year then by month', () => {
    const dividends: DividendRecord[] = [
      { date: '2025-01-10', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 1, totalKRW: 1000 },
      { date: '2023-12-10', ticker: 'B', name: 'B', amountKRW: 0, amountUSD: 1, totalKRW: 1000 },
      { date: '2024-06-10', ticker: 'C', name: 'C', amountKRW: 0, amountUSD: 1, totalKRW: 1000 },
      { date: '2024-03-10', ticker: 'D', name: 'D', amountKRW: 0, amountUSD: 1, totalKRW: 1000 },
    ]
    const result = aggregateMonthlyDividends(dividends)
    expect(result.map((r) => `${r.year}-${r.month}`)).toEqual([
      '2023-12월',
      '2024-3월',
      '2024-6월',
      '2025-1월',
    ])
  })

  it('rounds fractional totalKRW amounts', () => {
    const dividends: DividendRecord[] = [
      {
        date: '2024-04-01',
        ticker: 'T',
        name: 'T',
        amountKRW: 0,
        amountUSD: 1.5,
        totalKRW: 1500.7,
      },
    ]
    const result = aggregateMonthlyDividends(dividends)
    expect(result[0]?.amount).toBe(1501)
  })
})

// ============================================
// aggregateYearlyDividends
// ============================================

describe('aggregateYearlyDividends', () => {
  it('returns correct yearly totals for multiple years', () => {
    const dividends: DividendRecord[] = [
      { date: '2023-06-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 1, totalKRW: 50000 },
      { date: '2023-12-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 1, totalKRW: 50000 },
      { date: '2024-03-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 1, totalKRW: 120000 },
    ]
    const result = aggregateYearlyDividends(dividends)
    expect(result).not.toBeNull()
    expect(result!.data).toHaveLength(2)
    expect(result!.data[0]).toMatchObject({ year: '2023년', amount: 100000 })
    expect(result!.data[1]).toMatchObject({ year: '2024년', amount: 120000 })
  })

  it('calculates CAGR when there are 2 or more years', () => {
    const dividends: DividendRecord[] = [
      { date: '2023-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 100000 },
      { date: '2024-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 110000 },
      { date: '2025-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 121000 },
    ]
    const result = aggregateYearlyDividends(dividends)
    expect(result).not.toBeNull()
    expect(result!.cagr).toBeDefined()
    // nper = 2025 - 2023 + 1 = 3; (121000/100000)^(1/3) - 1 ≈ 0.0660 → ~6.6%
    expect(result!.cagr).toBeCloseTo(6.6, 0)
  })

  it('does not include CAGR for a single year', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-06-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 80000 },
    ]
    const result = aggregateYearlyDividends(dividends)
    expect(result).not.toBeNull()
    expect(result!.cagr).toBeUndefined()
  })

  it('returns null for empty dividends', () => {
    expect(aggregateYearlyDividends([])).toBeNull()
  })

  it('formats year as "${year}년"', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 10000 },
    ]
    const result = aggregateYearlyDividends(dividends)
    expect(result!.data[0]?.year).toBe('2024년')
  })
})

// ============================================
// aggregateDividendsByYear
// ============================================

describe('aggregateDividendsByYear', () => {
  it('groups dividends by year-month correctly', () => {
    const dividends: DividendRecord[] = [
      { date: '2023-03-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 1000 },
      { date: '2024-03-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 2000 },
    ]
    const result = aggregateDividendsByYear(dividends)
    expect(result).not.toBeNull()
    // March row (month "3") should have 2023: 1000, 2024: 2000
    const marchRow = result!.data.find((d) => d.month === '3')
    expect(marchRow?.['2023']).toBe(1000)
    expect(marchRow?.['2024']).toBe(2000)
  })

  it('returns a sorted years array', () => {
    const dividends: DividendRecord[] = [
      { date: '2025-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 1000 },
      { date: '2023-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 1000 },
      { date: '2024-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 1000 },
    ]
    const result = aggregateDividendsByYear(dividends)
    expect(result!.years).toEqual([2023, 2024, 2025])
  })

  it('returns null for empty dividends', () => {
    expect(aggregateDividendsByYear([])).toBeNull()
  })

  it('data always has 12 month entries', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-06-15', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 5000 },
    ]
    const result = aggregateDividendsByYear(dividends)
    expect(result!.data).toHaveLength(12)
  })
})

// ============================================
// calculateCumulativeDividend
// ============================================

describe('calculateCumulativeDividend', () => {
  it('calculates running cumulative sum correctly', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-01-15', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 10000 },
      { date: '2024-02-15', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 20000 },
    ]
    const result = calculateCumulativeDividend(dividends)
    expect(result).not.toBeNull()
    const jan = result!.data.find((d) => d.month === '24.01')
    const feb = result!.data.find((d) => d.month === '24.02')
    expect(jan?.cumulative).toBe(10000)
    expect(feb?.cumulative).toBe(30000)
  })

  it('fills gaps between months with the carried cumulative value', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-01-15', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 10000 },
      { date: '2024-04-15', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 5000 },
    ]
    const result = calculateCumulativeDividend(dividends)
    expect(result).not.toBeNull()
    // Feb and Mar should carry forward 10000
    const feb = result!.data.find((d) => d.month === '24.02')
    const mar = result!.data.find((d) => d.month === '24.03')
    const apr = result!.data.find((d) => d.month === '24.04')
    expect(feb?.cumulative).toBe(10000)
    expect(mar?.cumulative).toBe(10000)
    expect(apr?.cumulative).toBe(15000)
  })

  it('formats month as "YY.MM"', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-01-10', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 1000 },
    ]
    const result = calculateCumulativeDividend(dividends)
    expect(result).not.toBeNull()
    expect(result!.data[0]?.month).toMatch(/^\d{2}\.\d{2}$/)
    expect(result!.data[0]?.month).toBe('24.01')
  })

  it('returns null for empty dividends', () => {
    expect(calculateCumulativeDividend([])).toBeNull()
  })

  it('handles a single dividend correctly', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-06-20', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 7500 },
    ]
    const result = calculateCumulativeDividend(dividends)
    expect(result).not.toBeNull()
    const jun = result!.data.find((d) => d.month === '24.06')
    expect(jun?.cumulative).toBe(7500)
  })
})

// ============================================
// calculateRollingAverageDividend
// ============================================

describe('calculateRollingAverageDividend', () => {
  it('calculates 12-month rolling average correctly', () => {
    // 12 months of equal 12000 each → average for month 12 = (12*12000)/12 = 12000
    const dividends: DividendRecord[] = Array.from({ length: 12 }, (_, i) => ({
      date: `2024-${String(i + 1).padStart(2, '0')}-01`,
      ticker: 'A',
      name: 'A',
      amountKRW: 0,
      amountUSD: 0,
      totalKRW: 12000,
    }))
    const result = calculateRollingAverageDividend(dividends)
    expect(result).not.toBeNull()
    const dec = result!.data.find((d) => d.month === '24.12')
    expect(dec?.average).toBe(12000)
  })

  it('always divides by 12 even with fewer than 12 months of data', () => {
    // 3 months of 12000 each → average for month 3 = (3*12000)/12 = 3000
    const dividends: DividendRecord[] = [
      { date: '2024-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 12000 },
      { date: '2024-02-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 12000 },
      { date: '2024-03-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 12000 },
    ]
    const result = calculateRollingAverageDividend(dividends)
    expect(result).not.toBeNull()
    const mar = result!.data.find((d) => d.month === '24.03')
    expect(mar?.average).toBe(3000)
  })

  it('returns null for empty dividends', () => {
    expect(calculateRollingAverageDividend([])).toBeNull()
  })

  it('uses startMonth as range start when it is earlier than first dividend month', () => {
    // startMonth '23.11' is before first dividend '2024-01', so output starts from '23.11'
    const dividends: DividendRecord[] = [
      { date: '2024-01-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 5000 },
      { date: '2024-02-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 5000 },
      { date: '2024-03-01', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 5000 },
    ]
    const result = calculateRollingAverageDividend(dividends, '23.11')
    expect(result).not.toBeNull()
    const months = result!.data.map((d) => d.month)
    expect(months[0]).toBe('23.11')
    expect(months).toContain('24.01')
  })

  it('formats month as "YY.MM"', () => {
    const dividends: DividendRecord[] = [
      { date: '2024-05-10', ticker: 'A', name: 'A', amountKRW: 0, amountUSD: 0, totalKRW: 8000 },
    ]
    const result = calculateRollingAverageDividend(dividends)
    expect(result).not.toBeNull()
    expect(result!.data[0]?.month).toMatch(/^\d{2}\.\d{2}$/)
  })
})

// ============================================
// parseAccountSummary
// ============================================

describe('parseAccountSummary', () => {
  it('parses basic labels and their following values', () => {
    const rows = [
      ['총자산', 50000000],
      ['수익률', 12.5],
      ['투자원금', 40000000],
      ['수익금', 10000000],
    ]
    const result = parseAccountSummary(rows)
    expect(result.totalAsset).toBe(50000000)
    expect(result.totalYield).toBe(12.5)
    expect(result.totalInvested).toBe(40000000)
    expect(result.totalProfit).toBe(10000000)
  })

  it('cleans currency symbols (₩, $, %) from values', () => {
    const rows = [
      ['총자산', '₩50,000,000'],
      ['수익률', '12.5%'],
      ['투자원금', '$40,000'],
      ['수익금', '10,000,000'],
    ]
    const result = parseAccountSummary(rows)
    expect(result.totalAsset).toBe(50000000)
    expect(result.totalYield).toBe(12.5)
    expect(result.totalInvested).toBe(40000)
    expect(result.totalProfit).toBe(10000000)
  })

  it('returns all zeros for empty rows', () => {
    const result = parseAccountSummary([])
    expect(result).toEqual({
      totalAsset: 0,
      totalYield: 0,
      totalInvested: 0,
      totalProfit: 0,
    })
  })

  it('recognizes alternative label variants for totalAsset', () => {
    const rows = [['평가금액', 30000000]]
    const result = parseAccountSummary(rows)
    expect(result.totalAsset).toBe(30000000)
  })

  it('recognizes alternative label variant 평가액 for totalAsset', () => {
    const rows = [['평가액', 25000000]]
    const result = parseAccountSummary(rows)
    expect(result.totalAsset).toBe(25000000)
  })

  it('finds the first non-zero value after the label', () => {
    // Label in col 0, zero in col 1, real value in col 2
    const rows = [['총자산', 0, 99000000]]
    const result = parseAccountSummary(rows)
    expect(result.totalAsset).toBe(99000000)
  })
})

// ============================================
// parsePortfolioData
// ============================================

describe('parsePortfolioData', () => {
  // row structure: [0,1,2=country,3=ticker,4=name,5=qty,6=avgKRW,7=avgUSD,8=currentPrice,9=?,10=totalValue,11=weight]
  // parsePortfolioData guards rows.length <= 1, so always pass at least 2 rows (a dummy + the real one)
  const makeRow = (overrides: Record<number, any> = {}): any[] => {
    const row: any[] = ['', '', '한국', '005930', '삼성전자', 10, 70000, 0, 75000, '', 750000, 0.15]
    for (const [idx, val] of Object.entries(overrides)) {
      row[Number(idx)] = val
    }
    return row
  }

  // A dummy first row that will be skipped (ticker contains '종목')
  const headerRow = [
    '',
    '',
    '국가',
    '종목코드',
    '종목명',
    '수량',
    '평단가(원)',
    '평단가($)',
    '현재가',
    '',
    '평가액',
    '비중',
  ]

  it('parses a Korean stock with KRW prices', () => {
    const rows = [headerRow, makeRow()]
    const result = parsePortfolioData(rows)
    expect(result).toHaveLength(1)
    const item = result[0]!
    expect(item.ticker).toBe('005930')
    expect(item.name).toBe('삼성전자')
    expect(item.country).toBe('한국')
    expect(item.currency).toBe('KRW')
    expect(item.quantity).toBe(10)
    expect(item.avgPrice).toBe(70000)
    expect(item.currentPrice).toBe(75000)
    expect(item.totalValue).toBe(750000)
    expect(item.profit).toBe(750000 - 700000)
  })

  it('falls back to USD price for US stock when KRW avgPrice is 0', () => {
    const rows = [
      headerRow,
      makeRow({
        2: '미국',
        3: 'AAPL',
        4: 'Apple Inc',
        5: 2,
        6: 0,
        7: 150,
        8: 0,
        10: 420000,
        11: 0.1,
      }),
    ]
    const result = parsePortfolioData(rows, 1400)
    expect(result).toHaveLength(1)
    const item = result[0]!
    expect(item.avgPrice).toBe(150 * 1400)
    expect(item.currency).toBe('USD')
  })

  it('handles CASH row as a special case', () => {
    // CASH row: ticker=CASH, G(idx6)=krwAmount, H(idx7)=usdAmount
    // Need 2+ rows to pass the rows.length <= 1 guard; use headerRow as first row
    const rows = [headerRow, ['', '', '', 'CASH', '현금', 0, 1000000, 500, 0, '', 0, 0]]
    const result = parsePortfolioData(rows, 1400)
    expect(result).toHaveLength(1)
    const item = result[0]!
    expect(item.ticker).toBe('CASH')
    expect(item.totalValue).toBe(Math.round(1000000 + 500 * 1400))
  })

  it('skips header rows where ticker contains "종목" or "티커"', () => {
    const rows = [
      ['', '', '국가', '종목코드', '종목명', '수량', '평단가', '', '', '', '', ''],
      makeRow(),
    ]
    const result = parsePortfolioData(rows)
    expect(result).toHaveLength(1)
    expect(result[0]?.ticker).toBe('005930')
  })

  it('skips rows with no name', () => {
    const rows = [headerRow, makeRow({ 4: '' })]
    const result = parsePortfolioData(rows)
    expect(result).toHaveLength(0)
  })

  it('converts weight from decimal to percent when between 0 and 1', () => {
    const rows = [headerRow, makeRow({ 11: 0.286 })]
    const result = parsePortfolioData(rows)
    expect(result[0]?.weight).toBeCloseTo(28.6, 1)
  })

  it('leaves weight as-is when already greater than 1', () => {
    const rows = [headerRow, makeRow({ 11: 28.6 })]
    const result = parsePortfolioData(rows)
    expect(result[0]?.weight).toBeCloseTo(28.6, 1)
  })
})

// ============================================
// parseMonthlyProfitLoss
// ============================================

describe('parseMonthlyProfitLoss', () => {
  // row structure for E:J: [yearVal, monthVal, col2, col3, col4, profitVal]
  const makeRow = (year: number, month: string, profit: any): any[] => [
    String(year),
    month,
    '',
    '',
    '',
    profit,
  ]

  it('parses positive monthly profit correctly', () => {
    const rows = [makeRow(2025, '3월', '₩500,000')]
    const result = parseMonthlyProfitLoss(rows, 2025)
    const march = result.find((r) => r.month === '3월')
    expect(march?.profit).toBe(500000)
    expect(march?.loss).toBe(0)
  })

  it('parses negative monthly loss with ▼ symbol correctly', () => {
    const rows = [makeRow(2025, '5월', '▼₩1,428,545')]
    const result = parseMonthlyProfitLoss(rows, 2025)
    const may = result.find((r) => r.month === '5월')
    expect(may?.loss).toBe(1428545)
    expect(may?.profit).toBe(0)
  })

  it('returns empty array for empty rows input', () => {
    const result = parseMonthlyProfitLoss([], 2025)
    expect(result).toHaveLength(0)
  })

  it('returns 12 monthly entries with zeros for rows that have no matching year', () => {
    // Rows exist but none match targetYear=2025
    const rows = [makeRow(2024, '1월', '₩100,000')]
    const result = parseMonthlyProfitLoss(rows, 2025)
    expect(result).toHaveLength(12)
    for (const entry of result) {
      expect(entry.profit).toBe(0)
      expect(entry.loss).toBe(0)
    }
  })

  it('filters rows by targetYear and ignores other years', () => {
    const rows = [makeRow(2024, '1월', '₩100,000'), makeRow(2025, '1월', '₩200,000')]
    const result = parseMonthlyProfitLoss(rows, 2025)
    const jan = result.find((r) => r.month === '1월')
    expect(jan?.profit).toBe(200000)
  })
})
