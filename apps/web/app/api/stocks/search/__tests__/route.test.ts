import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('../../../../../lib/alternative-asset-api', () => ({
  searchAlternativeAssets: vi.fn(() => []),
}))

vi.mock('../../../../../lib/krx-api', () => ({
  fetchAllStocks: vi.fn(() => Promise.resolve([])),
  searchStocks: vi.fn(() => []),
}))

import { createServiceClient } from '@repo/database/server'
import { type NextRequest } from 'next/server'
import { GET } from '../route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(q: string): NextRequest {
  const url = `http://localhost/api/stocks/search?q=${encodeURIComponent(q)}`
  return {
    nextUrl: {
      searchParams: new URLSearchParams({ q }),
    },
  } as unknown as NextRequest
}

type StockRow = { code: string; name: string; market: string; eng_name?: string }

function buildSupabaseMock(stocks: StockRow[], totalCount: number) {
  // Capture the .or() calls so we can verify AND chaining
  const orCalls: string[] = []

  const chain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockImplementation((filter: string) => {
      orCalls.push(filter)
      return chain
    }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: stocks, error: null }),
    ),
  }
  ;(chain as any).__orCalls = orCalls

  // For count query
  const countChain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // biome-ignore lint/suspicious/noThenProperty: intentional
    then: (resolve: (v: any) => any) =>
      Promise.resolve({ count: totalCount, error: null }).then(resolve),
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'stocks') return chain
        return chain
      }),
    },
    orCalls,
    countChain,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/stocks/search – AND-based multi-token query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array for blank query', async () => {
    const req = makeRequest('')
    const res = await GET(req)
    const body = await res.json()
    expect(body.stocks).toEqual([])
  })

  it('calls .or() once for a single-token query', async () => {
    const stocks: StockRow[] = [
      { code: '005930', name: '삼성전자', market: 'KOSPI' },
    ]
    const { supabase, orCalls } = buildSupabaseMock(stocks, 1)
    vi.mocked(createServiceClient).mockReturnValue(supabase as any)

    await GET(makeRequest('삼성'))

    // Single token → one .or() call
    expect(orCalls).toHaveLength(1)
    expect(orCalls[0]).toContain('삼성')
  })

  it('calls .or() once per token for multi-token query (AND semantics)', async () => {
    const stocks: StockRow[] = [
      { code: '123456', name: 'TIGER 미국배당', market: 'KOSPI', eng_name: 'TIGER US DIV' },
    ]
    const { supabase, orCalls } = buildSupabaseMock(stocks, 1)
    vi.mocked(createServiceClient).mockReturnValue(supabase as any)

    await GET(makeRequest('tiger 미국'))

    // Two tokens → two .or() calls chained (AND behaviour)
    expect(orCalls).toHaveLength(2)
    expect(orCalls[0]).toContain('tiger')
    expect(orCalls[1]).toContain('미국')
  })

  it('each .or() filter covers code, name, and eng_name fields', async () => {
    const stocks: StockRow[] = []
    const { supabase, orCalls } = buildSupabaseMock(stocks, 0)
    vi.mocked(createServiceClient).mockReturnValue(supabase as any)

    await GET(makeRequest('sol 미국'))

    // Each filter should include all three columns
    for (const filter of orCalls) {
      expect(filter).toContain('code.ilike.')
      expect(filter).toContain('name.ilike.')
      expect(filter).toContain('eng_name.ilike.')
    }
  })

  it('returns stocks from supabase when found, with source="supabase"', async () => {
    const stocks: StockRow[] = [
      { code: '123456', name: 'TIGER 미국배당', market: 'KOSDAQ' },
    ]
    const { supabase } = buildSupabaseMock(stocks, 1)
    vi.mocked(createServiceClient).mockReturnValue(supabase as any)

    const res = await GET(makeRequest('tiger'))
    const body = await res.json()

    expect(body.source).toBe('supabase')
    expect(body.stocks.some((s: any) => s.code === '123456')).toBe(true)
  })

  it('multi-token AND filter: result must contain all tokens', async () => {
    // Supabase returns both matching and non-matching stocks (limit(200) scenario)
    // The client-side AND filter should remove stocks missing any token
    const stocks: StockRow[] = [
      { code: 'A', name: 'TIGER 미국배당', market: 'KOSPI' },       // matches both "tiger" and "미국"
      { code: 'B', name: 'TIGER 한국배당', market: 'KOSPI' },       // matches "tiger" only
      { code: 'C', name: '미래에셋 미국 ETF', market: 'KOSDAQ' },   // matches "미국" only
    ]
    const { supabase } = buildSupabaseMock(stocks, 3)
    vi.mocked(createServiceClient).mockReturnValue(supabase as any)

    const res = await GET(makeRequest('tiger 미국'))
    const body = await res.json()

    // Only 'A' matches both tokens
    const codes = body.stocks.map((s: any) => s.code)
    expect(codes).toContain('A')
    expect(codes).not.toContain('B')
    expect(codes).not.toContain('C')
  })

  it('single-token query returns all DB results without further filtering', async () => {
    const stocks: StockRow[] = [
      { code: 'A', name: 'TIGER 미국배당', market: 'KOSPI' },
      { code: 'B', name: 'TIGER 한국배당', market: 'KOSPI' },
    ]
    const { supabase } = buildSupabaseMock(stocks, 2)
    vi.mocked(createServiceClient).mockReturnValue(supabase as any)

    const res = await GET(makeRequest('tiger'))
    const body = await res.json()

    const codes = body.stocks.map((s: any) => s.code)
    expect(codes).toContain('A')
    expect(codes).toContain('B')
  })
})
