import { describe, expect, it } from 'vitest'
import { calculateMarketYields, enrichRowsWithExchangeRates } from '../exchange-rate-enrichment'
import type { HistoricalMarketData } from '../historical-exchange-rate'

// ---------------------------------------------------------------------------
// enrichRowsWithExchangeRates
// ---------------------------------------------------------------------------

describe('enrichRowsWithExchangeRates', () => {
  const makeRow = (date: string, sp500 = 100, nasdaq = 100): any[] => {
    const row: any[] = new Array(22).fill(undefined)
    row[0] = date
    row[10] = sp500
    row[11] = nasdaq
    return row
  }

  it('applies exchange rates to rows and injects values at correct indices', () => {
    const rates = new Map([
      ['25.01', 1400],
      ['25.02', 1450],
    ])
    const rows = [makeRow('25.01', 110, 120), makeRow('25.02', 115, 125)]
    const result = enrichRowsWithExchangeRates(rows, rates, 1400)

    // baseRate = 1400 (from first row)
    // Row 0: dollarIdx = (1400/1400)*100 = 100
    expect(result[0][23]).toBe(1400)
    expect(result[0][33]).toBeCloseTo(100)
    expect(result[0][28]).toBeCloseTo(110) // 110 * 100/100
    expect(result[0][29]).toBeCloseTo(120)
    expect(result[0][34]).toBeCloseTo(110)
    expect(result[0][35]).toBeCloseTo(120)

    // Row 1: dollarIdx = (1450/1400)*100 ≈ 103.571
    const dollarIdx1 = (1450 / 1400) * 100
    expect(result[1][23]).toBe(1450)
    expect(result[1][33]).toBeCloseTo(dollarIdx1)
    expect(result[1][28]).toBeCloseTo((115 * dollarIdx1) / 100)
    expect(result[1][29]).toBeCloseTo((125 * dollarIdx1) / 100)
  })

  it('calculates S&P500 and NASDAQ dollar-applied indices correctly', () => {
    const rates = new Map([
      ['25.01', 1000],
      ['25.03', 1100],
    ])
    const rows = [makeRow('25.01', 120, 200), makeRow('25.03', 130, 210)]
    const result = enrichRowsWithExchangeRates(rows, rates, 1000)

    const baseRate = 1000
    const dollarIdx = (1100 / baseRate) * 100
    expect(result[1][28]).toBeCloseTo((130 * dollarIdx) / 100)
    expect(result[1][29]).toBeCloseTo((210 * dollarIdx) / 100)
    expect(result[1][34]).toBeCloseTo((130 * dollarIdx) / 100)
    expect(result[1][35]).toBeCloseTo((210 * dollarIdx) / 100)
  })

  it('returns empty array when rows is empty', () => {
    const rates = new Map([['25.01', 1400]])
    const result = enrichRowsWithExchangeRates([], rates, 1400)
    expect(result).toEqual([])
  })

  it('returns original rows when exchangeRates map is empty', () => {
    const rows = [makeRow('25.01', 100, 100)]
    const result = enrichRowsWithExchangeRates(rows, new Map(), 1400)
    expect(result).toBe(rows)
  })

  it('returns original rows when no row date matches any exchange rate and map fallback also has no valid rate', () => {
    // All rates are 0 → no valid baseRate
    const rates = new Map<string, number>([['25.01', 0]])
    const rows = [makeRow('25.01', 100, 100)]
    const result = enrichRowsWithExchangeRates(rows, rates, 0)
    expect(result).toBe(rows)
  })

  it('falls back to currentRate when a month has no entry in exchangeRates map', () => {
    const rates = new Map([['25.01', 1400]])
    // '25.02' is not in map
    const rows = [makeRow('25.01', 100, 100), makeRow('25.02', 110, 110)]
    const result = enrichRowsWithExchangeRates(rows, rates, 1500)

    // baseRate = 1400 (first row)
    // Row 1: rate falls back to currentRate = 1500
    expect(result[1][23]).toBe(1500)
    const dollarIdx = (1500 / 1400) * 100
    expect(result[1][33]).toBeCloseTo(dollarIdx)
  })

  it('passes through non-date rows unchanged', () => {
    const rates = new Map([['25.01', 1400]])
    const nonDateRow = ['header', 'text', 123]
    const dateRow = makeRow('25.01', 100, 100)
    const rows = [nonDateRow, dateRow]
    const result = enrichRowsWithExchangeRates(rows, rates, 1400)

    // Non-date row is returned as-is
    expect(result[0]).toBe(nonDateRow)
    // Date row is enriched
    expect(result[1][23]).toBe(1400)
  })

  it('extends row array to length 36', () => {
    const rates = new Map([['25.01', 1400]])
    const rows = [makeRow('25.01', 100, 100)]
    const result = enrichRowsWithExchangeRates(rows, rates, 1400)
    expect(result[0].length).toBe(36)
  })

  it('uses earliest map entry as baseRate when first row date has no matching rate', () => {
    // Row date '25.05' is not in the map → no rate found for first row
    // Falls back to earliest key '25.01' (rate=1200) as baseRate
    // Then '25.05' not in map → falls back to currentRate=1300
    const rates = new Map([
      ['25.01', 1200],
      ['25.02', 1250],
    ])
    const rows = [makeRow('25.05', 100, 100)]
    const result = enrichRowsWithExchangeRates(rows, rates, 1300)

    // baseRate = 1200 (earliest key in map, since '25.05' has no entry)
    // rate for '25.05' = currentRate = 1300
    const dollarIdx = (1300 / 1200) * 100
    expect(result[0][33]).toBeCloseTo(dollarIdx)
  })
})

// ---------------------------------------------------------------------------
// calculateMarketYields
// ---------------------------------------------------------------------------

describe('calculateMarketYields', () => {
  const makeMarketData = (overrides: Partial<HistoricalMarketData> = {}): HistoricalMarketData => ({
    exchangeRates: new Map(),
    gold: new Map(),
    bitcoin: new Map(),
    realEstate: new Map(),
    kospi: new Map(),
    sp500: new Map(),
    nasdaq: new Map(),
    sp500Krw: new Map(),
    nasdaqKrw: new Map(),
    goldUsd: new Map(),
    bitcoinUsd: new Map(),
    ...overrides,
  })

  const months = ['시작', '1월', '2월', '3월']
  const currentYear = 2026
  const baselineKey = '25.12' // previous year December

  it('returns all 11 yield series', () => {
    const marketData = makeMarketData()
    const result = calculateMarketYields(months, marketData, currentYear)

    expect(result).toHaveProperty('gold')
    expect(result).toHaveProperty('bitcoin')
    expect(result).toHaveProperty('realEstate')
    expect(result).toHaveProperty('dollar')
    expect(result).toHaveProperty('kospi')
    expect(result).toHaveProperty('sp500')
    expect(result).toHaveProperty('nasdaq')
    expect(result).toHaveProperty('sp500Dollar')
    expect(result).toHaveProperty('nasdaqDollar')
    expect(result).toHaveProperty('goldDollar')
    expect(result).toHaveProperty('bitcoinDollar')
  })

  it('all series start with 0 at index 0', () => {
    const marketData = makeMarketData()
    const result = calculateMarketYields(months, marketData, currentYear)

    for (const series of Object.values(result)) {
      expect(series[0]).toBe(0)
    }
  })

  it('calculates YTD yield as (current/baseline - 1) * 100 rounded to 1 decimal', () => {
    const goldUsd = new Map([
      [baselineKey, 2000],
      ['26.01', 2100],
    ])
    const gold = new Map([
      [baselineKey, 2800000],
      ['26.01', 2940000],
    ])
    const marketData = makeMarketData({ goldUsd, gold })

    const result = calculateMarketYields(months, marketData, currentYear)

    // gold (USD): (2100/2000 - 1) * 100 = 5.0
    expect(result.gold[1]).toBe(5.0)
  })

  it('uses previous year December as baseline', () => {
    // currentYear = 2026, so baseline = "25.12"
    const sp500 = new Map([
      ['25.12', 5000],
      ['26.01', 5500],
    ])
    const marketData = makeMarketData({ sp500 })

    const result = calculateMarketYields(months, marketData, currentYear)

    // (5500/5000 - 1) * 100 = 10.0
    expect(result.sp500[1]).toBe(10.0)
  })

  it('gold uses goldUsd as primary (USD denomination)', () => {
    const goldUsd = new Map([
      [baselineKey, 1800],
      ['26.01', 1890],
    ])
    const marketData = makeMarketData({ goldUsd })

    const result = calculateMarketYields(months, marketData, currentYear)

    const expected = Math.round((1890 / 1800 - 1) * 100 * 10) / 10
    expect(result.gold[1]).toBe(expected)
  })

  it('goldDollar uses gold KRW as primary', () => {
    const gold = new Map([
      [baselineKey, 2500000],
      ['26.01', 2625000],
    ])
    const marketData = makeMarketData({ gold })

    const result = calculateMarketYields(months, marketData, currentYear)

    const expected = Math.round((2625000 / 2500000 - 1) * 100 * 10) / 10
    expect(result.goldDollar[1]).toBe(expected)
  })

  it('bitcoin uses bitcoinUsd as primary (USD denomination)', () => {
    const bitcoinUsd = new Map([
      [baselineKey, 90000],
      ['26.01', 99000],
    ])
    const marketData = makeMarketData({ bitcoinUsd })

    const result = calculateMarketYields(months, marketData, currentYear)

    const expected = Math.round((99000 / 90000 - 1) * 100 * 10) / 10
    expect(result.bitcoin[1]).toBe(expected)
  })

  it('bitcoinDollar uses bitcoin KRW as primary', () => {
    const bitcoin = new Map([
      [baselineKey, 130000000],
      ['26.01', 143000000],
    ])
    const marketData = makeMarketData({ bitcoin })

    const result = calculateMarketYields(months, marketData, currentYear)

    const expected = Math.round((143000000 / 130000000 - 1) * 100 * 10) / 10
    expect(result.bitcoinDollar[1]).toBe(expected)
  })

  it('forward-fills previous value when month data is missing (null)', () => {
    // '26.01' present, '26.02' missing, '26.03' present
    const dollar = new Map([
      [baselineKey, 1400],
      ['26.01', 1450],
      ['26.03', 1500],
    ])
    const marketData = makeMarketData({ exchangeRates: dollar })

    const result = calculateMarketYields(months, marketData, currentYear)

    const yield1 = Math.round((1450 / 1400 - 1) * 100 * 10) / 10
    // '26.02' missing → forward-fill from '26.01'
    expect(result.dollar[1]).toBe(yield1)
    expect(result.dollar[2]).toBe(yield1) // forward-filled
    const yield3 = Math.round((1500 / 1400 - 1) * 100 * 10) / 10
    expect(result.dollar[3]).toBe(yield3)
  })

  it('all yields stay 0 when baseline is missing', () => {
    // No '25.12' entry → no baseline
    const sp500 = new Map([['26.01', 5000]])
    const marketData = makeMarketData({ sp500 })

    const result = calculateMarketYields(months, marketData, currentYear)

    expect(result.sp500).toEqual([0, 0, 0, 0])
  })

  it('all series are all zeros when market data is empty', () => {
    const marketData = makeMarketData()
    const result = calculateMarketYields(months, marketData, currentYear)

    for (const series of Object.values(result)) {
      expect(series.every((v) => v === 0)).toBe(true)
    }
  })

  it('handles single month correctly', () => {
    const singleMonths = ['시작', '1월']
    const kospi = new Map([
      [baselineKey, 2500],
      ['26.01', 2600],
    ])
    const marketData = makeMarketData({ kospi })

    const result = calculateMarketYields(singleMonths, marketData, currentYear)

    expect(result.kospi).toHaveLength(2)
    expect(result.kospi[0]).toBe(0)
    const expected = Math.round((2600 / 2500 - 1) * 100 * 10) / 10
    expect(result.kospi[1]).toBe(expected)
  })

  it('rounds to 1 decimal place', () => {
    // (1463 / 1400 - 1) * 100 = 4.5000 → 4.5
    const dollar = new Map([
      [baselineKey, 1400],
      ['26.01', 1463],
    ])
    const marketData = makeMarketData({ exchangeRates: dollar })

    const result = calculateMarketYields(months, marketData, currentYear)

    const raw = (1463 / 1400 - 1) * 100
    const expected = Math.round(raw * 10) / 10
    expect(result.dollar[1]).toBe(expected)
  })
})
