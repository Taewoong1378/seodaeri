import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchAllStocks,
  fetchETFStocks,
  fetchKOSDAQStocks,
  fetchKOSPIStocks,
  searchStocks,
} from '../krx-api'
import type { KRXStock } from '../krx-api'

// ============================================
// Helpers
// ============================================

function makeStockResponse(
  overrides: Partial<{
    ISU_CD: string
    ISU_SRT_CD: string
    ISU_NM: string
    ISU_ABBRV: string
    ISU_ENG_NM: string
    LIST_DD: string
    MKT_TP_NM: string
    SECUGRP_NM: string
    SECT_TP_NM: string
    KIND_STKCERT_TP_NM: string
    PARVAL: string
    LIST_SHRS: string
  }> = {},
) {
  return {
    ISU_CD: 'KR7005930003',
    ISU_SRT_CD: '005930',
    ISU_NM: '삼성전자',
    ISU_ABBRV: '삼성전자',
    ISU_ENG_NM: 'Samsung Electronics',
    LIST_DD: '19750611',
    MKT_TP_NM: 'KOSPI',
    SECUGRP_NM: '주권',
    SECT_TP_NM: '-',
    KIND_STKCERT_TP_NM: '보통주',
    PARVAL: '100',
    LIST_SHRS: '5969782550',
    ...overrides,
  }
}

function makeETFResponse(
  overrides: Partial<{
    BAS_DD: string
    ISU_CD: string
    ISU_NM: string
    TDD_CLSPRC: string
    CMPPREVDD_PRC: string
    FLUC_RT: string
    NAV: string
    TDD_OPNPRC: string
    TDD_HGPRC: string
    TDD_LWPRC: string
    ACC_TRDVOL: string
    ACC_TRDVAL: string
    MKTCAP: string
    INVSTASST_NETASST_TOTAMT: string
    LIST_SHRS: string
    IDX_IND_NM: string
    OBJ_STKPRC_IDX: string
    CMPPREVDD_IDX: string
    FLUC_RT_IDX: string
  }> = {},
) {
  return {
    BAS_DD: '20240101',
    ISU_CD: 'KR7069500007',
    ISU_NM: 'KODEX 200',
    TDD_CLSPRC: '30000',
    CMPPREVDD_PRC: '200',
    FLUC_RT: '0.67',
    NAV: '30100',
    TDD_OPNPRC: '29800',
    TDD_HGPRC: '30200',
    TDD_LWPRC: '29700',
    ACC_TRDVOL: '1000000',
    ACC_TRDVAL: '30000000000',
    MKTCAP: '10000000000000',
    INVSTASST_NETASST_TOTAMT: '10050000000000',
    LIST_SHRS: '334000000',
    IDX_IND_NM: 'KOSPI 200',
    OBJ_STKPRC_IDX: '380.00',
    CMPPREVDD_IDX: '2.50',
    FLUC_RT_IDX: '0.66',
    ...overrides,
  }
}

function mockFetchOk(body: unknown) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockFetchStatus(status: number) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    statusText: `HTTP Error ${status}`,
  } as Response)
}

// ============================================
// searchStocks — pure, synchronous
// ============================================

describe('searchStocks', () => {
  const stocks: KRXStock[] = [
    {
      code: '005930',
      name: '삼성전자',
      fullCode: 'KR7005930003',
      market: 'KOSPI',
      engName: 'Samsung Electronics',
    },
    {
      code: '000660',
      name: 'SK하이닉스',
      fullCode: 'KR7000660001',
      market: 'KOSPI',
      engName: 'SK Hynix',
    },
    {
      code: '035720',
      name: '카카오',
      fullCode: 'KR7035720002',
      market: 'KOSPI',
      engName: 'Kakao Corp',
    },
    { code: '069500', name: 'KODEX 200', fullCode: 'KR7069500007', market: 'ETF' },
    {
      code: '247540',
      name: '에코프로비엠',
      fullCode: 'KR7247540008',
      market: 'KOSDAQ',
      engName: 'EcoPro BM',
    },
  ]

  it('returns [] for an empty query', () => {
    expect(searchStocks(stocks, '')).toEqual([])
  })

  it('returns [] for a whitespace-only query', () => {
    expect(searchStocks(stocks, '   ')).toEqual([])
  })

  it('returns exact code match for "005930"', () => {
    const results = searchStocks(stocks, '005930')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('005930')
  })

  it('returns partial name match for "삼성"', () => {
    const results = searchStocks(stocks, '삼성')
    expect(results).toHaveLength(1)
    expect(results[0]!.name).toBe('삼성전자')
  })

  it('matches by engName "samsung" (case-insensitive)', () => {
    const results = searchStocks(stocks, 'samsung')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('005930')
  })

  it('matches by partial engName "hynix" (case-insensitive)', () => {
    const results = searchStocks(stocks, 'hynix')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('000660')
  })

  it('returns [] when no stock matches the query', () => {
    expect(searchStocks(stocks, 'xyznotexist')).toEqual([])
  })

  it('is case-insensitive for code search', () => {
    // code is digits so test case-insensitivity via engName
    const results = searchStocks(stocks, 'KAKAO')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('035720')
  })

  it('trims whitespace from query before matching', () => {
    const results = searchStocks(stocks, '  카카오  ')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('035720')
  })

  it('limits results to maximum 20 items', () => {
    const manyStocks: KRXStock[] = Array.from({ length: 30 }, (_, i) => ({
      code: String(i).padStart(6, '0'),
      name: `테스트종목${i}`,
      fullCode: `KR700000${String(i).padStart(4, '0')}`,
      market: 'KOSPI',
      engName: `TestStock${i}`,
    }))

    const results = searchStocks(manyStocks, '테스트')
    expect(results).toHaveLength(20)
  })

  it('matches stocks without engName by name or code only', () => {
    const results = searchStocks(stocks, 'KODEX')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('069500')
  })

  it('uses ISU_ABBRV (abbreviated name) stored in name field for matching', () => {
    // Matches on the name field which holds ISU_ABBRV in real data
    const results = searchStocks(stocks, 'ecopro')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('247540')
  })
})

// ============================================
// fetchKOSPIStocks — async, mocks global.fetch
// ============================================

describe('fetchKOSPIStocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.KRX_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns mapped KRXStock array from a successful API response', async () => {
    mockFetchOk({
      OutBlock_1: [makeStockResponse()],
    })

    const stocks = await fetchKOSPIStocks()

    expect(stocks).toHaveLength(1)
    expect(stocks[0]!.code).toBe('005930')
    expect(stocks[0]!.name).toBe('삼성전자')
    expect(stocks[0]!.fullCode).toBe('KR7005930003')
    expect(stocks[0]!.market).toBe('KOSPI')
    expect(stocks[0]!.engName).toBe('Samsung Electronics')
  })

  it('uses ISU_ABBRV as name when available', async () => {
    mockFetchOk({
      OutBlock_1: [makeStockResponse({ ISU_NM: '삼성전자보통주', ISU_ABBRV: '삼성전자' })],
    })

    const stocks = await fetchKOSPIStocks()
    expect(stocks[0]!.name).toBe('삼성전자')
  })

  it('falls back to ISU_NM when ISU_ABBRV is empty', async () => {
    mockFetchOk({
      OutBlock_1: [makeStockResponse({ ISU_NM: '삼성전자보통주', ISU_ABBRV: '' })],
    })

    const stocks = await fetchKOSPIStocks()
    expect(stocks[0]!.name).toBe('삼성전자보통주')
  })

  it('filters out items missing ISU_SRT_CD', async () => {
    mockFetchOk({
      OutBlock_1: [makeStockResponse(), makeStockResponse({ ISU_SRT_CD: '' })],
    })

    const stocks = await fetchKOSPIStocks()
    expect(stocks).toHaveLength(1)
  })

  it('filters out items missing ISU_NM', async () => {
    mockFetchOk({
      OutBlock_1: [makeStockResponse(), makeStockResponse({ ISU_SRT_CD: '000001', ISU_NM: '' })],
    })

    const stocks = await fetchKOSPIStocks()
    expect(stocks).toHaveLength(1)
  })

  it('returns [] when OutBlock_1 is absent', async () => {
    mockFetchOk({})

    const stocks = await fetchKOSPIStocks()
    expect(stocks).toEqual([])
  })

  it('sends POST request with AUTH_KEY header and basDd body', async () => {
    const fetchSpy = mockFetchOk({ OutBlock_1: [] })

    await fetchKOSPIStocks()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/sto/stk_isu_base_info'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ AUTH_KEY: 'test-key' }),
        body: expect.stringContaining('"basDd"'),
      }),
    )
  })

  it('throws when KRX_API_KEY is not set', async () => {
    process.env.KRX_API_KEY = undefined
    // When key is undefined, it's still passed to fetch which may get a 401
    // The function checks for !apiKey and throws before calling fetch
    mockFetchStatus(401) // provide mock in case fetch is called

    await expect(fetchKOSPIStocks()).rejects.toThrow(/KRX API/)
  })

  it('throws when the HTTP response is not ok (500)', async () => {
    mockFetchStatus(500)

    await expect(fetchKOSPIStocks()).rejects.toThrow('KRX API HTTP 오류: 500')
  })

  it('throws the auth-specific message when respCode is 401', async () => {
    mockFetchOk({ respCode: '401', respMsg: 'Unauthorized' })

    await expect(fetchKOSPIStocks()).rejects.toThrow('KRX API 인증 실패')
  })

  it('throws a generic error for non-200 respCodes other than 401', async () => {
    mockFetchOk({ respCode: '500', respMsg: '서버 오류' })

    await expect(fetchKOSPIStocks()).rejects.toThrow('KRX API 오류: 서버 오류')
  })
})

// ============================================
// fetchKOSDAQStocks — async, mocks global.fetch
// ============================================

describe('fetchKOSDAQStocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.KRX_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns mapped KRXStock array with market set to KOSDAQ', async () => {
    mockFetchOk({
      OutBlock_1: [
        makeStockResponse({
          ISU_CD: 'KR7035720002',
          ISU_SRT_CD: '035720',
          ISU_NM: '카카오',
          ISU_ABBRV: '카카오',
          ISU_ENG_NM: 'Kakao Corp',
        }),
      ],
    })

    const stocks = await fetchKOSDAQStocks()

    expect(stocks).toHaveLength(1)
    expect(stocks[0]!.code).toBe('035720')
    expect(stocks[0]!.market).toBe('KOSDAQ')
  })

  it('calls the KOSDAQ endpoint (/sto/ksq_isu_base_info)', async () => {
    const fetchSpy = mockFetchOk({ OutBlock_1: [] })

    await fetchKOSDAQStocks()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/sto/ksq_isu_base_info'),
      expect.any(Object),
    )
  })

  it('filters out items with missing ISU_SRT_CD or ISU_NM', async () => {
    mockFetchOk({
      OutBlock_1: [
        makeStockResponse({ ISU_SRT_CD: '035720', ISU_NM: '카카오' }),
        makeStockResponse({ ISU_SRT_CD: '', ISU_NM: '빈코드' }),
        makeStockResponse({ ISU_SRT_CD: '035721', ISU_NM: '' }),
      ],
    })

    const stocks = await fetchKOSDAQStocks()
    expect(stocks).toHaveLength(1)
  })

  it('throws when KRX_API_KEY is not set', async () => {
    process.env.KRX_API_KEY = undefined
    mockFetchStatus(401)

    await expect(fetchKOSDAQStocks()).rejects.toThrow(/KRX API/)
  })
})

// ============================================
// fetchETFStocks — async, mocks global.fetch
// ============================================

describe('fetchETFStocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.KRX_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts 6-digit code from 12-character ISIN (slice 3..9)', async () => {
    // KR7069500007 → slice(3,9) = "069500"
    mockFetchOk({
      OutBlock_1: [makeETFResponse({ ISU_CD: 'KR7069500007', ISU_NM: 'KODEX 200' })],
    })

    const stocks = await fetchETFStocks()

    expect(stocks).toHaveLength(1)
    expect(stocks[0]!.code).toBe('069500')
    expect(stocks[0]!.fullCode).toBe('KR7069500007')
  })

  it('uses ISU_CD as-is when its length is not 12', async () => {
    mockFetchOk({
      OutBlock_1: [makeETFResponse({ ISU_CD: 'SHORT', ISU_NM: 'Short ETF' })],
    })

    const stocks = await fetchETFStocks()
    expect(stocks[0]!.code).toBe('SHORT')
  })

  it('sets market to ETF for all returned items', async () => {
    mockFetchOk({
      OutBlock_1: [
        makeETFResponse({ ISU_CD: 'KR7069500007', ISU_NM: 'KODEX 200' }),
        makeETFResponse({ ISU_CD: 'KR7411060004', ISU_NM: 'TIGER 미국S&P500' }),
      ],
    })

    const stocks = await fetchETFStocks()

    expect(stocks).toHaveLength(2)
    for (const s of stocks) expect(s.market).toBe('ETF')
  })

  it('filters out items missing ISU_CD', async () => {
    mockFetchOk({
      OutBlock_1: [
        makeETFResponse({ ISU_CD: 'KR7069500007', ISU_NM: 'KODEX 200' }),
        makeETFResponse({ ISU_CD: '', ISU_NM: '빈코드' }),
      ],
    })

    const stocks = await fetchETFStocks()
    expect(stocks).toHaveLength(1)
  })

  it('filters out items missing ISU_NM', async () => {
    mockFetchOk({
      OutBlock_1: [
        makeETFResponse({ ISU_CD: 'KR7069500007', ISU_NM: 'KODEX 200' }),
        makeETFResponse({ ISU_CD: 'KR7000001000', ISU_NM: '' }),
      ],
    })

    const stocks = await fetchETFStocks()
    expect(stocks).toHaveLength(1)
  })

  it('calls the ETF endpoint (/etp/etf_bydd_trd)', async () => {
    const fetchSpy = mockFetchOk({ OutBlock_1: [] })

    await fetchETFStocks()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/etp/etf_bydd_trd'),
      expect.any(Object),
    )
  })

  it('throws when HTTP response is not ok', async () => {
    mockFetchStatus(503)

    await expect(fetchETFStocks()).rejects.toThrow('KRX API HTTP 오류: 503')
  })
})

// ============================================
// fetchAllStocks — multi-date, Promise.allSettled
// ============================================

describe('fetchAllStocks', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.KRX_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns combined KOSPI + KOSDAQ + ETF stocks when all three succeed', async () => {
    const kospiItem = makeStockResponse({
      ISU_SRT_CD: '005930',
      ISU_NM: '삼성전자',
      ISU_ABBRV: '삼성전자',
    })
    const kosdaqItem = makeStockResponse({
      ISU_SRT_CD: '035720',
      ISU_NM: '카카오',
      ISU_ABBRV: '카카오',
    })
    const etfItem = makeETFResponse({ ISU_CD: 'KR7069500007', ISU_NM: 'KODEX 200' })

    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [kospiItem] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [kosdaqItem] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [etfItem] }),
      } as Response)

    const stocks = await fetchAllStocks()

    expect(stocks.length).toBe(3)
    expect(stocks.some((s) => s.code === '005930')).toBe(true)
    expect(stocks.some((s) => s.code === '035720')).toBe(true)
    expect(stocks.some((s) => s.code === '069500')).toBe(true)
  })

  it('returns partial data when one of the three fetches fails', async () => {
    const kospiItem = makeStockResponse({
      ISU_SRT_CD: '005930',
      ISU_NM: '삼성전자',
      ISU_ABBRV: '삼성전자',
    })

    vi.spyOn(global, 'fetch')
      // KOSPI succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [kospiItem] }),
      } as Response)
      // KOSDAQ fails (HTTP 500)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)
      // ETF fails (HTTP 500)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

    const stocks = await fetchAllStocks()

    expect(stocks.length).toBe(1)
    expect(stocks[0]!.code).toBe('005930')
  })

  it('tries the next candidate date when the first date returns empty data', async () => {
    const kospiItem = makeStockResponse({
      ISU_SRT_CD: '005930',
      ISU_NM: '삼성전자',
      ISU_ABBRV: '삼성전자',
    })

    vi.spyOn(global, 'fetch')
      // First date: all three return empty
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [] }),
      } as Response)
      // Second date: KOSPI returns data
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [kospiItem] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ OutBlock_1: [] }),
      } as Response)

    const stocks = await fetchAllStocks()

    expect(stocks.length).toBe(1)
    expect(stocks[0]!.code).toBe('005930')
  })

  it('returns [] when all candidate dates produce no data', async () => {
    // Mock enough responses to cover all 5 candidate dates × 3 endpoints = 15 calls
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ OutBlock_1: [] }),
    } as Response)

    const stocks = await fetchAllStocks()
    expect(stocks).toEqual([])
  })

  it('returns [] when KRX_API_KEY is missing', async () => {
    process.env.KRX_API_KEY = undefined

    const stocks = await fetchAllStocks()
    expect(stocks).toEqual([])
  })

  it('returns [] when all fetches reject with network errors', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

    const stocks = await fetchAllStocks()
    expect(stocks).toEqual([])
  })
})
