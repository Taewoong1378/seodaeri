import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPriceCache, getStockPrice, isKoreanStock } from '../stock-price-api'

vi.mock('../kis-token', () => ({
  getKISToken: vi.fn(() => Promise.resolve('mock-token')),
  KIS_BASE_URL: 'https://openapi.koreainvestment.com:9443',
}))

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn(() => ({ error: null })),
    })),
  })),
}))

// ============================================
// isKoreanStock
// ============================================

describe('isKoreanStock', () => {
  it('returns true for a 6-digit numeric ticker (Samsung Electronics)', () => {
    expect(isKoreanStock('005930')).toBe(true)
  })

  it('returns true for a KR ISIN code (12 chars, KR + 10 digits)', () => {
    expect(isKoreanStock('KR7005930003')).toBe(true)
  })

  it('returns false for a US ticker symbol', () => {
    expect(isKoreanStock('AAPL')).toBe(false)
  })

  it('returns true for a 6-digit ETF code', () => {
    expect(isKoreanStock('069500')).toBe(true)
  })

  it('returns false for an empty string', () => {
    expect(isKoreanStock('')).toBe(false)
  })

  it('returns false for a 5-digit number (too short)', () => {
    expect(isKoreanStock('05930')).toBe(false)
  })

  it('returns false for a partial KR ISIN (too short)', () => {
    expect(isKoreanStock('KR123')).toBe(false)
  })
})

// ============================================
// getStockPrice
// ============================================

describe('getStockPrice', () => {
  beforeEach(() => {
    clearPriceCache()
    vi.restoreAllMocks()
    // Restore env vars used by the API functions
    process.env.KIS_APP_KEY = 'test-app-key'
    process.env.KIS_APP_SECRET = 'test-app-secret'
  })

  it('returns KRW price for a Korean stock', async () => {
    const mockResponse = {
      rt_cd: '0',
      msg_cd: 'MCA00000',
      msg1: '정상처리',
      output: {
        stck_prpr: '75000',
        prdy_vrss: '500',
        prdy_ctrt: '0.67',
        stck_oprc: '74500',
        stck_hgpr: '75500',
        stck_lwpr: '74000',
        acml_vol: '12345678',
        acml_tr_pbmn: '925000000000',
      },
    }

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await getStockPrice('005930')

    expect(result).not.toBeNull()
    expect(result?.ticker).toBe('005930')
    expect(result?.price).toBe(75000)
    expect(result?.currency).toBe('KRW')
    expect(result?.change).toBe(500)
    expect(result?.changePercent).toBe(0.67)
    expect(result?.source).toBe('kis')
  })

  it('returns USD price for a US stock', async () => {
    const mockResponse = {
      rt_cd: '0',
      msg_cd: 'MCA00000',
      msg1: 'success',
      output: {
        rsym: 'DAAPL',
        zdiv: '2',
        base: '189.50',
        pvol: '55000000',
        last: '192.35',
        sign: '2',
        diff: '2.85',
        rate: '1.50',
        tvol: '60000000',
        tamt: '11541000000',
        ordy: 'Y',
      },
    }

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await getStockPrice('AAPL')

    expect(result).not.toBeNull()
    expect(result?.ticker).toBe('AAPL')
    expect(result?.price).toBe(192.35)
    expect(result?.currency).toBe('USD')
    expect(result?.change).toBe(2.85)
    expect(result?.source).toBe('kis-overseas')
  })

  it('returns cached data without hitting the network on second call', async () => {
    const mockResponse = {
      rt_cd: '0',
      msg_cd: 'MCA00000',
      msg1: '정상처리',
      output: {
        stck_prpr: '80000',
        prdy_vrss: '1000',
        prdy_ctrt: '1.27',
        stck_oprc: '79000',
        stck_hgpr: '80500',
        stck_lwpr: '78500',
        acml_vol: '9876543',
        acml_tr_pbmn: '790000000000',
      },
    }

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    // First call — fetches from API
    const first = await getStockPrice('000660')
    expect(first?.price).toBe(80000)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second call — should come from memory cache
    const second = await getStockPrice('000660')
    expect(second?.price).toBe(80000)
    expect(fetchSpy).toHaveBeenCalledTimes(1) // no additional fetch
  })

  it('returns null when the API call fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    // retryCount=0 to avoid real delays
    const result = await getStockPrice('999999', 0)

    expect(result).toBeNull()
  })
})
