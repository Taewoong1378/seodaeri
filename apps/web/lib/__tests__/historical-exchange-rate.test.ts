import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted before any imports of the module under test)
// ---------------------------------------------------------------------------

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('../exchange-rate-api', () => ({
  getUSDKRWRate: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal CSV that parseCSVExchangeRates / parseCSVMarketData can consume.
 *
 * Column layout (0-indexed):
 *   6  = date (YY.MM)
 *   7  = USD/KRW rate
 *   11 = KOSPI
 *   12 = S&P500 (USD)
 *   13 = NASDAQ (USD)
 *   19 = S&P500 KRW
 *   20 = NASDAQ KRW
 *   21 = gold KRW
 *   22 = bitcoin KRW
 *   26 = real estate index
 *
 * We fill the unused columns with empty strings.
 */
function buildCSVRow(
  date: string,
  rate: string,
  opts: {
    kospi?: string
    sp500?: string
    nasdaq?: string
    sp500Krw?: string
    nasdaqKrw?: string
    goldKrw?: string
    btcKrw?: string
    realEstate?: string
  } = {},
): string {
  // 27 columns (indices 0-26)
  const cols: string[] = new Array(27).fill('')
  cols[6] = date
  cols[7] = rate
  cols[11] = opts.kospi ?? ''
  cols[12] = opts.sp500 ?? ''
  cols[13] = opts.nasdaq ?? ''
  cols[19] = opts.sp500Krw ?? ''
  cols[20] = opts.nasdaqKrw ?? ''
  cols[21] = opts.goldKrw ?? ''
  cols[22] = opts.btcKrw ?? ''
  cols[26] = opts.realEstate ?? ''
  return cols.join(',')
}

function buildCSV(dataRows: string[]): string {
  return ['header1', 'header2', ...dataRows].join('\n')
}

// ---------------------------------------------------------------------------
// DB mock factory
// ---------------------------------------------------------------------------

function makeDbMock(
  overrides: {
    selectResult?: { data: any; error: any }
    upsertResult?: { error: any }
  } = {},
) {
  const selectResult = overrides.selectResult ?? { data: null, error: null }
  const upsertResult = overrides.upsertResult ?? { error: null }

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve(selectResult)),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve(upsertResult)),
    })),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getHistoricalExchangeRates', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses a valid CSV and returns a Map with correct entries', async () => {
    const csv = buildCSV([buildCSVRow('25.01', '1450.00'), buildCSVRow('25.02', '1400.00')])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalExchangeRates } = await import('../historical-exchange-rate')
    const rates = await getHistoricalExchangeRates()

    expect(rates.get('25.01')).toBe(1450.0)
    expect(rates.get('25.02')).toBe(1400.0)
  })

  it('correctly parses quoted numbers with commas like "1,069.02"', async () => {
    const csv = buildCSV([
      // Manually craft a row where column 7 has a quoted value
      ',,,,,,25.01,"1,069.02"',
    ])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1069.02)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalExchangeRates } = await import('../historical-exchange-rate')
    const rates = await getHistoricalExchangeRates()

    expect(rates.get('25.01')).toBeCloseTo(1069.02)
  })

  it('falls back to DB cache when fetch fails', async () => {
    const cachedRates = { '25.01': 1350, '25.02': 1380 }

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(
      makeDbMock({
        selectResult: {
          data: { value: { rates: cachedRates } },
          error: null,
        },
      }) as any,
    )
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { getHistoricalExchangeRates } = await import('../historical-exchange-rate')
    const rates = await getHistoricalExchangeRates()

    expect(rates.get('25.01')).toBe(1350)
    expect(rates.get('25.02')).toBe(1380)
  })

  it('returns empty Map when both fetch and DB fail', async () => {
    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(
      makeDbMock({
        selectResult: { data: null, error: new Error('DB error') },
      }) as any,
    )
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { getHistoricalExchangeRates } = await import('../historical-exchange-rate')
    const rates = await getHistoricalExchangeRates()

    expect(rates.size).toBe(0)
  })
})

describe('getHistoricalMarketData', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('populates all 11 maps from CSV data', async () => {
    const csv = buildCSV([
      buildCSVRow('25.01', '1450', {
        kospi: '2500',
        sp500: '5000',
        nasdaq: '16000',
        sp500Krw: '6500000',
        nasdaqKrw: '7200000',
        goldKrw: '150000000',
        btcKrw: '100000000',
        realEstate: '105.5',
      }),
    ])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1450)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalMarketData } = await import('../historical-exchange-rate')
    const data = await getHistoricalMarketData()

    expect(data.exchangeRates.get('25.01')).toBe(1450)
    expect(data.kospi.get('25.01')).toBe(2500)
    expect(data.sp500.get('25.01')).toBe(5000)
    expect(data.nasdaq.get('25.01')).toBe(16000)
    expect(data.sp500Krw.get('25.01')).toBe(6500000)
    expect(data.nasdaqKrw.get('25.01')).toBe(7200000)
    expect(data.gold.get('25.01')).toBe(150000000)
    expect(data.bitcoin.get('25.01')).toBe(100000000)
    expect(data.realEstate.get('25.01')).toBe(105.5)
  })

  it('derives goldUsd by dividing gold KRW by exchange rate', async () => {
    const goldKrw = 150000000
    const rate = 1500
    const csv = buildCSV([buildCSVRow('25.01', String(rate), { goldKrw: String(goldKrw) })])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(rate)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalMarketData } = await import('../historical-exchange-rate')
    const data = await getHistoricalMarketData()

    expect(data.goldUsd?.get('25.01')).toBeCloseTo(goldKrw / rate)
  })

  it('derives bitcoinUsd by dividing bitcoin KRW by exchange rate', async () => {
    const btcKrw = 130000000
    const rate = 1300
    const csv = buildCSV([buildCSVRow('25.01', String(rate), { btcKrw: String(btcKrw) })])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(rate)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalMarketData } = await import('../historical-exchange-rate')
    const data = await getHistoricalMarketData()

    expect(data.bitcoinUsd?.get('25.01')).toBeCloseTo(btcKrw / rate)
  })

  it('returns empty maps when fetch fails', async () => {
    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const { getHistoricalMarketData } = await import('../historical-exchange-rate')
    const data = await getHistoricalMarketData()

    expect(data.exchangeRates.size).toBe(0)
    expect(data.gold.size).toBe(0)
    expect(data.bitcoin.size).toBe(0)
    expect(data.realEstate.size).toBe(0)
  })

  it('skips rows with invalid date format', async () => {
    const csv = buildCSV([
      buildCSVRow('INVALID', '1450', { kospi: '2500' }),
      buildCSVRow('25.02', '1400', { kospi: '2550' }),
    ])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalMarketData } = await import('../historical-exchange-rate')
    const data = await getHistoricalMarketData()

    expect(data.exchangeRates.has('INVALID')).toBe(false)
    expect(data.exchangeRates.get('25.02')).toBe(1400)
  })

  it('handles multiple months correctly', async () => {
    const csv = buildCSV([
      buildCSVRow('25.01', '1450', { sp500: '5000' }),
      buildCSVRow('25.02', '1400', { sp500: '5100' }),
      buildCSVRow('25.03', '1420', { sp500: '5200' }),
    ])

    const { createServiceClient } = await import('@repo/database/server')
    const { getUSDKRWRate } = await import('../exchange-rate-api')

    vi.mocked(createServiceClient).mockReturnValue(makeDbMock() as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1420)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csv),
    } as any)

    const { getHistoricalMarketData } = await import('../historical-exchange-rate')
    const data = await getHistoricalMarketData()

    expect(data.sp500.size).toBe(3)
    expect(data.sp500.get('25.01')).toBe(5000)
    expect(data.sp500.get('25.02')).toBe(5100)
    expect(data.sp500.get('25.03')).toBe(5200)
  })
})
