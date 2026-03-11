import { beforeEach, describe, expect, it, vi } from 'vitest'

// ============================================
// node:fs mock — hoisted before module imports
// ============================================

vi.mock('node:fs', () => {
  const readFileSyncMock = vi.fn((path: string) => {
    if (path.includes('nasdaq.csv')) {
      return [
        'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
        'AAPL,Apple Inc. Common Stock,$189.50,2.85,1.52%,2950000000000,United States,1980,55000000,Technology,Consumer Electronics',
        'MSFT,Microsoft Corporation,$415.20,3.10,0.75%,3080000000000,United States,1986,22000000,Technology,Software',
        'GOOGL,Alphabet Inc. Class A,$175.30,1.20,0.69%,2200000000000,United States,2004,18000000,Technology,Internet',
        // Symbol with >5 chars (should be filtered)
        'TOOLONG,Too Long Symbol,$10.00,0.00,0.00%,100000000,United States,2000,100000,Finance,Banks',
        // Symbol with digits (should be filtered)
        'ABC1,Invalid Symbol,$5.00,0.00,0.00%,50000000,United States,2001,50000,Finance,Banks',
        // Symbol with dot (should be filtered)
        'BRK.B,Berkshire Hathaway,$350.00,0.00,0.00%,500000000000,United States,1965,1000000,Finance,Insurance',
      ].join('\n')
    }
    if (path.includes('nyse.csv')) {
      return [
        'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
        'JPM,JPMorgan Chase & Co. Common Stock,$195.00,1.50,0.78%,560000000000,United States,1969,8000000,Finance,Banks',
        // Duplicate of AAPL — should be deduped
        'AAPL,Apple Inc. Common Stock,$189.50,2.85,1.52%,2950000000000,United States,1980,55000000,Technology,Consumer Electronics',
      ].join('\n')
    }
    if (path.includes('amex.csv')) {
      return [
        'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
        'AMC,AMC Networks Inc.,$5.00,0.10,2.04%,400000000,United States,2011,2000000,Communications,Broadcasting',
      ].join('\n')
    }
    if (path.includes('etf.csv')) {
      return [
        'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
        'SPY,SPDR S&P 500 ETF Trust,$500.00,3.00,0.60%,500000000000,United States,1993,70000000,,',
        'QQQ,Invesco QQQ Trust,$440.00,2.50,0.57%,220000000000,United States,1999,45000000,,',
        // TQQQ in CSV — should NOT be re-added from missing list
        'TQQQ,ProShares UltraPro QQQ,$60.00,1.20,2.04%,20000000000,United States,2010,90000000,,',
      ].join('\n')
    }
    return ''
  })

  return {
    default: {
      existsSync: vi.fn(() => true),
      mkdirSync: vi.fn(),
      readFileSync: readFileSyncMock,
      writeFileSync: vi.fn(),
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readFileSync: readFileSyncMock,
    writeFileSync: vi.fn(),
  }
})

import { fetchUSStocks, searchUSStocksLocal } from '../us-stocks-api'

// ============================================
// fetchUSStocks — loads from mocked CSV files
// ============================================

describe('fetchUSStocks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns stocks from all four CSV files combined', async () => {
    const stocks = await fetchUSStocks()
    const codes = stocks.map((s) => s.code)

    expect(codes).toContain('AAPL') // nasdaq.csv
    expect(codes).toContain('JPM') // nyse.csv
    expect(codes).toContain('AMC') // amex.csv
    expect(codes).toContain('SPY') // etf.csv
  })

  it('deduplicates stocks appearing in multiple CSV files', async () => {
    const stocks = await fetchUSStocks()
    const aaplEntries = stocks.filter((s) => s.code === 'AAPL')

    // AAPL appears in both nasdaq.csv and nyse.csv
    expect(aaplEntries).toHaveLength(1)
  })

  it('strips " Common Stock" suffix from stock names', async () => {
    const stocks = await fetchUSStocks()
    const aapl = stocks.find((s) => s.code === 'AAPL')

    expect(aapl?.name).toBe('Apple Inc.')
    expect(aapl?.name).not.toContain('Common Stock')
  })

  it('strips " Class A" suffix from stock names', async () => {
    const stocks = await fetchUSStocks()
    const googl = stocks.find((s) => s.code === 'GOOGL')

    expect(googl?.name).toBe('Alphabet Inc.')
    expect(googl?.name).not.toContain('Class A')
  })

  it('filters out symbols longer than 5 characters', async () => {
    const stocks = await fetchUSStocks()
    const codes = stocks.map((s) => s.code)

    expect(codes).not.toContain('TOOLONG')
  })

  it('filters out symbols containing digits', async () => {
    const stocks = await fetchUSStocks()
    const codes = stocks.map((s) => s.code)

    expect(codes).not.toContain('ABC1')
  })

  it('filters out symbols containing dots', async () => {
    const stocks = await fetchUSStocks()
    const codes = stocks.map((s) => s.code)

    expect(codes).not.toContain('BRK.B')
  })

  it('assigns market label NASDAQ to stocks from nasdaq.csv', async () => {
    const stocks = await fetchUSStocks()
    const aapl = stocks.find((s) => s.code === 'AAPL')

    expect(aapl?.market).toBe('NASDAQ')
  })

  it('assigns market label NYSE to stocks from nyse.csv', async () => {
    const stocks = await fetchUSStocks()
    const jpm = stocks.find((s) => s.code === 'JPM')

    expect(jpm?.market).toBe('NYSE')
  })

  it('assigns market label AMEX to stocks from amex.csv', async () => {
    const stocks = await fetchUSStocks()
    const amc = stocks.find((s) => s.code === 'AMC')

    expect(amc?.market).toBe('AMEX')
  })

  it('assigns market label US_ETF to stocks from etf.csv', async () => {
    const stocks = await fetchUSStocks()
    const spy = stocks.find((s) => s.code === 'SPY')

    expect(spy?.market).toBe('US_ETF')
  })

  it('supplements missing popular ETFs not present in CSV files', async () => {
    // FNGU is not in any mock CSV → should be added from the hardcoded list
    const stocks = await fetchUSStocks()
    const fngu = stocks.find((s) => s.code === 'FNGU')

    expect(fngu).toBeDefined()
    expect(fngu?.market).toBe('US_ETF')
    expect(fngu?.name).toBe('MicroSectors FANG+ Index 3X Leveraged ETN')
  })

  it('does not add a missing ETF supplement when that code already exists in CSV', async () => {
    // TQQQ is in etf.csv mock — should not be duplicated
    const stocks = await fetchUSStocks()
    const tqqqEntries = stocks.filter((s) => s.code === 'TQQQ')

    expect(tqqqEntries).toHaveLength(1)
  })

  it('supplements all popular ETFs absent from CSV files', async () => {
    // From the hardcoded list: FNGU, CURE, TNA, FAS, LABU, NUGT, NAIL, DFEN, WEBL, FNGD
    // are not in the mock CSVs (TQQQ is present, so it is skipped)
    const missingEtfCodes = [
      'FNGU',
      'CURE',
      'TNA',
      'FAS',
      'LABU',
      'NUGT',
      'NAIL',
      'DFEN',
      'WEBL',
      'FNGD',
    ]
    const stocks = await fetchUSStocks()
    const codes = stocks.map((s) => s.code)

    for (const code of missingEtfCodes) {
      expect(codes).toContain(code)
    }
  })

  it('includes sector and industry when available in CSV', async () => {
    const stocks = await fetchUSStocks()
    const aapl = stocks.find((s) => s.code === 'AAPL')

    expect(aapl?.sector).toBe('Technology')
    expect(aapl?.industry).toBe('Consumer Electronics')
  })

  it('sets sector to undefined when CSV column is empty', async () => {
    const stocks = await fetchUSStocks()
    const spy = stocks.find((s) => s.code === 'SPY')

    // etf.csv mock has empty Sector/Industry columns
    expect(spy?.sector).toBeUndefined()
  })
})

// ============================================
// fetchUSStocks — CSV parsing edge cases
// ============================================

describe('fetchUSStocks CSV parsing', () => {
  it('handles quoted fields containing commas without splitting them', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          'ACME,"Acme Corp, Inc.",$10.00,0.00,0.00%,1000000,United States,2000,10000,Finance,Banks',
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })

    const stocks = await fetchUSStocks()
    const acme = stocks.find((s) => s.code === 'ACME')

    expect(acme).toBeDefined()
    // The quoted comma must not have split the name field
    expect(acme?.name).toContain('Acme Corp')
  })

  it('skips empty lines in CSV content', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          '',
          'AAPL,Apple Inc.,$189.50,2.85,1.52%,2950000000000,United States,1980,55000000,Technology,Consumer Electronics',
          '',
          'MSFT,Microsoft Corporation,$415.20,3.10,0.75%,3080000000000,United States,1986,22000000,Technology,Software',
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })

    const stocks = await fetchUSStocks()
    const nasdaqStocks = stocks.filter((s) => s.market === 'NASDAQ')

    expect(nasdaqStocks).toHaveLength(2)
  })

  it('skips rows with empty Symbol and Name', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          'AAPL,Apple Inc.,$189.50,2.85,1.52%,2950000000000,United States,1980,55000000,Technology,Consumer Electronics',
          ',,,,,,,,,,',
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })

    const stocks = await fetchUSStocks()
    const nasdaqStocks = stocks.filter((s) => s.market === 'NASDAQ')

    expect(nasdaqStocks).toHaveLength(1)
  })
})

// ============================================
// fetchUSStocks — file error resilience
// ============================================

describe('fetchUSStocks file error resilience', () => {
  it('continues loading other files when one CSV file cannot be read', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        throw new Error('ENOENT: no such file or directory')
      }
      if (p.includes('nyse.csv')) {
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          'JPM,JPMorgan Chase & Co.,$195.00,1.50,0.78%,560000000000,United States,1969,8000000,Finance,Banks',
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })

    const stocks = await fetchUSStocks()
    const codes = stocks.map((s) => s.code)

    expect(codes).toContain('JPM') // nyse.csv still loaded
    expect(codes).not.toContain('AAPL') // nasdaq.csv failed
  })

  it('returns only supplemental ETFs when all CSV files fail to read', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory')
    })

    const stocks = await fetchUSStocks()

    // Hardcoded missing popular ETFs should still be present
    expect(stocks.length).toBeGreaterThan(0)
    expect(stocks.every((s) => s.market === 'US_ETF')).toBe(true)
  })
})

// ============================================
// searchUSStocksLocal — async search wrapper
// ============================================

describe('searchUSStocksLocal', () => {
  beforeEach(async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          'AAPL,Apple Inc. Common Stock,$189.50,2.85,1.52%,2950000000000,United States,1980,55000000,Technology,Consumer Electronics',
          'AMZN,Amazon.com Inc.,$185.00,2.00,1.09%,1920000000000,United States,1997,35000000,Consumer Discretionary,Internet Retail',
          'TSLA,Tesla Inc.,$245.00,5.00,2.08%,780000000000,United States,2010,100000000,Consumer Discretionary,Auto Manufacturers',
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })
  })

  it('returns [] for an empty query', async () => {
    const results = await searchUSStocksLocal('')
    expect(results).toEqual([])
  })

  it('returns [] for a whitespace-only query', async () => {
    const results = await searchUSStocksLocal('   ')
    expect(results).toEqual([])
  })

  it('finds stock by exact ticker code match', async () => {
    const results = await searchUSStocksLocal('AAPL')
    expect(results.some((s) => s.code === 'AAPL')).toBe(true)
  })

  it('finds stock by partial ticker code match', async () => {
    const results = await searchUSStocksLocal('AM')
    const codes = results.map((s) => s.code)
    expect(codes).toContain('AMZN')
  })

  it('finds stock by partial name match (case-insensitive)', async () => {
    const results = await searchUSStocksLocal('apple')
    expect(results.some((s) => s.code === 'AAPL')).toBe(true)
  })

  it('finds stock by uppercase name fragment', async () => {
    const results = await searchUSStocksLocal('TESLA')
    expect(results.some((s) => s.code === 'TSLA')).toBe(true)
  })

  it('returns [] when no stock matches the query', async () => {
    const results = await searchUSStocksLocal('XYZNOTEXIST')
    expect(results).toEqual([])
  })

  it('respects the limit parameter', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        const rows = Array.from({ length: 30 }, (_, i) => {
          const sym = `TS${String(i).padStart(3, '0')}`
          return `${sym},TestCo ${i},$10.00,0.00,0.00%,100000,US,2000,1000,,`
        })
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          ...rows,
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })

    const results = await searchUSStocksLocal('TestCo', 5)
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('defaults to a limit of 20 when no limit is specified', async () => {
    const fs = await import('node:fs')
    vi.mocked(fs.readFileSync).mockImplementation((path: unknown) => {
      const p = path as string
      if (p.includes('nasdaq.csv')) {
        const rows = Array.from({ length: 30 }, (_, i) => {
          const sym = `ST${String(i).padStart(3, '0')}`
          return `${sym},Stock Company ${i},$10.00,0.00,0.00%,100000,US,2000,1000,,`
        })
        return [
          'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry',
          ...rows,
        ].join('\n')
      }
      return 'Symbol,Name,Last Sale,Net Change,% Change,Market Cap,Country,IPO Year,Volume,Sector,Industry\n'
    })

    const results = await searchUSStocksLocal('Stock')
    expect(results.length).toBeLessThanOrEqual(20)
  })

  it('also searches supplemental ETFs not present in CSV files', async () => {
    // FNGU is hardcoded and not in the mock CSV
    const results = await searchUSStocksLocal('FNGU')
    expect(results.some((s) => s.code === 'FNGU')).toBe(true)
  })
})
