import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getExchangeRateInfo, getUSDKRWRate, refreshExchangeRate } from '../exchange-rate-api'

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

const mockSingle = vi.fn()
const mockUpsert = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a KoreaExim API response array containing a USD entry */
function makeKoreaEximResponse(dealBasR = '1,380.00') {
  return [
    { cur_unit: 'JPY(100)', cur_nm: '일본 엔', deal_bas_r: '960.50', result: 1 },
    { cur_unit: 'USD', cur_nm: '미국 달러', deal_bas_r: dealBasR, result: 1 },
    { cur_unit: 'EUR', cur_nm: '유럽연합 유로', deal_bas_r: '1,510.20', result: 1 },
  ]
}

/** Make fetch resolve with JSON data and ok=true */
function mockFetchSuccess(data: unknown) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response)
}

/** Make fetch resolve with ok=false */
function mockFetchHttpError(status = 500) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status,
  } as Response)
}

/** Make fetch reject (network error) */
function mockFetchNetworkError() {
  return vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(async () => {
  // Reset memory cache between tests by refreshing with a spy that returns null
  // We clear it by calling refreshExchangeRate indirectly — easier to just set
  // up DB to return null so the module-level cache is set after the test itself.
  // The safest approach: wipe memory cache before each test via refreshExchangeRate
  // with a DB+fetch returning null so the fallback path sets cache to null.
  // Instead we rely on: beforeEach resets all mocks, then each test configures
  // fresh spies. Memory cache persists across tests so we must clear it.
  vi.restoreAllMocks()

  // Default DB mock: no cached data
  mockSingle.mockResolvedValue({ data: null, error: null })
  mockUpsert.mockResolvedValue({ error: null })
  mockEq.mockReturnValue({ single: mockSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert })

  process.env.KOREAEXIM_API_KEY = 'test-api-key'

  // Clear the module-level memory cache by forcing a re-fetch that ends in
  // fallback (returns 1350) — this exercises the null-cache path.
  // We need fetch to fail so the memory cache is left null after the previous
  // test's call. Simplest: call refreshExchangeRate() with fetch failing so
  // memory cache is explicitly cleared (refreshExchangeRate sets memoryCache=null
  // then calls getUSDKRWRate which may populate it again). To truly clear it we
  // must keep memoryCache=null. We achieve this by NOT calling any rate function
  // here and instead resetting via a dedicated mechanism per test.
  //
  // Because the module cache is a closure variable we cannot access it directly.
  // We manage this by calling refreshExchangeRate() with DB+API returning null
  // so memoryCache ends up null after the clear. But that pollutes the test state.
  //
  // Chosen approach: each test that depends on a clean cache must call
  // refreshExchangeRate() (which sets memoryCache=null) at the start, with its
  // own fetch/DB mocks already configured for that test. Tests that rely on
  // memory cache being already populated chain naturally.
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ===========================================================================
// getUSDKRWRate — memory cache hit
// ===========================================================================

describe('getUSDKRWRate — memory cache', () => {
  it('returns cached rate on second call without hitting fetch again', async () => {
    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))

    // Prime the cache
    await refreshExchangeRate()
    const first = await getUSDKRWRate()
    expect(first).toBe(1380)
    const callsAfterFirst = fetchSpy.mock.calls.length

    // Second call — must use memory cache
    const second = await getUSDKRWRate()
    expect(second).toBe(1380)
    expect(fetchSpy).toHaveBeenCalledTimes(callsAfterFirst) // no extra fetch
  })

  it('returns a number type from memory cache', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,350.50'))
    await refreshExchangeRate()

    const rate = await getUSDKRWRate()
    expect(typeof rate).toBe('number')
  })
})

// ===========================================================================
// getUSDKRWRate — DB cache hit
// ===========================================================================

describe('getUSDKRWRate — DB cache', () => {
  it('returns rate from DB cache when memory cache is empty and DB entry is fresh', async () => {
    // DB cache: fresh (timestamp = now)
    const freshTimestamp = new Date().toISOString()
    mockSingle.mockResolvedValue({
      data: { value: { rate: 1420, source: 'koreaexim' }, updated_at: freshTimestamp },
      error: null,
    })

    // fetch must NOT be called
    const fetchSpy = vi.spyOn(global, 'fetch')

    // Clear memory cache first
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeKoreaEximResponse('1,420.00')),
    } as Response)

    // Force clear memory cache
    mockSingle.mockResolvedValueOnce({ data: null, error: null }) // for the refresh clear
    await refreshExchangeRate() // clears memoryCache → falls through to API

    // Now reset: DB returns a fresh entry, fetch is not needed
    fetchSpy.mockClear()
    mockSingle.mockResolvedValue({
      data: { value: { rate: 1420, source: 'koreaexim' }, updated_at: new Date().toISOString() },
      error: null,
    })

    // Manually clear memory cache by calling refreshExchangeRate with DB returning fresh data
    // To truly isolate: set memory cache to null by patching the module.
    // Since we cannot patch the closure directly, we rely on refreshExchangeRate clearing it.
    // refreshExchangeRate sets memoryCache=null then calls getUSDKRWRate.
    // getUSDKRWRate first checks memoryCache (null) → checks DB (fresh) → returns DB rate.
    const fetchSpy2 = vi.spyOn(global, 'fetch')
    // refreshExchangeRate always clears, so the next getUSDKRWRate call goes to DB
    const rate = await refreshExchangeRate()

    expect(rate).toBe(1420)
    // fetch was not called because DB cache was fresh
    expect(fetchSpy2).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// getUSDKRWRate — API success (new domain oapi)
// ===========================================================================

describe('getUSDKRWRate — KoreaExim API (new domain)', () => {
  it('fetches rate from new oapi domain when memory and DB caches are empty', async () => {
    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,395.00'))

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1395)
    // First URL called should be the new oapi domain
    const firstCallUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(firstCallUrl).toContain('oapi.koreaexim.go.kr')
  })

  it('strips commas from deal_bas_r before parsing', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,450.75'))

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1450.75)
  })

  it('finds USD entry among multiple currency rows', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,310.00'))

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1310)
  })

  it('uses KOREAEXIM_API_KEY env variable in the request URL', async () => {
    process.env.KOREAEXIM_API_KEY = 'my-secret-key'
    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))

    await refreshExchangeRate()

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('authkey=my-secret-key')
  })

  it('falls through to fallback rate when KOREAEXIM_API_KEY is missing', async () => {
    process.env.KOREAEXIM_API_KEY = undefined
    // fetchFromKoreaExim returns null when key is missing,
    // causing all Promise.any branches to reject → fallback 1350
    mockFetchSuccess([]) // provide a mock so fetch doesn't actually hit network

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)

    process.env.KOREAEXIM_API_KEY = 'test-api-key'
  })
})

// ===========================================================================
// getUSDKRWRate — API fallback (legacy domain www)
// ===========================================================================

describe('getUSDKRWRate — KoreaExim API (legacy domain fallback)', () => {
  it('falls back to legacy www domain when new oapi domain returns no USD data', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      // new domain: response has no USD entry
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { cur_unit: 'JPY(100)', cur_nm: '일본 엔', deal_bas_r: '960.50', result: 1 },
          ]),
      } as Response)
      // legacy domain: response has USD entry
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeKoreaEximResponse('1,370.00')),
      } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1370)
    // First call = oapi, second call = www
    const urls = fetchSpy.mock.calls.map((c) => c[0] as string)
    expect(urls.some((u) => u.includes('oapi.koreaexim.go.kr'))).toBe(true)
    expect(urls.some((u) => u.includes('www.koreaexim.go.kr'))).toBe(true)
  })

  it('falls back to legacy domain when new domain returns HTTP error', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeKoreaEximResponse('1,360.00')),
      } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1360)
  })

  it('falls back to legacy domain when new domain throws a network error', async () => {
    vi.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeKoreaEximResponse('1,355.00')),
      } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1355)
  })
})

// ===========================================================================
// getUSDKRWRate — all API dates fail → stale DB cache
// ===========================================================================

describe('getUSDKRWRate — stale DB cache fallback', () => {
  it('returns stale DB cache rate when all API calls fail', async () => {
    // DB returns a stale entry (2 hours ago)
    const staleTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    mockSingle.mockResolvedValue({
      data: { value: { rate: 1290, source: 'koreaexim' }, updated_at: staleTimestamp },
      error: null,
    })

    // All fetch calls fail
    mockFetchNetworkError()

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1290)
  })

  it('returns stale DB cache even when rate is old, preferring it over hardcoded fallback', async () => {
    const veryStaleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    mockSingle.mockResolvedValue({
      data: { value: { rate: 1250, source: 'koreaexim' }, updated_at: veryStaleTimestamp },
      error: null,
    })

    mockFetchNetworkError()

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1250)
    expect(rate).not.toBe(1350)
  })
})

// ===========================================================================
// getUSDKRWRate — final fallback (1350)
// ===========================================================================

describe('getUSDKRWRate — hardcoded fallback rate', () => {
  it('returns 1350 when memory cache, DB cache, and all API calls fail', async () => {
    // DB: no data
    mockSingle.mockResolvedValue({ data: null, error: null })
    // All API calls fail
    mockFetchNetworkError()

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })

  it('returns 1350 when fetch returns empty array for all dates', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })

  it('returns 1350 when API response contains no USD entry', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { cur_unit: 'JPY(100)', cur_nm: '일본 엔', deal_bas_r: '960.50', result: 1 },
          { cur_unit: 'EUR', cur_nm: '유럽연합 유로', deal_bas_r: '1,510.20', result: 1 },
        ]),
    } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })
})

// ===========================================================================
// getUSDKRWRate — business date generation (tested indirectly)
// ===========================================================================

describe('getUSDKRWRate — business date selection via fake timers', () => {
  it('starts from today when hour is 11 or later (API data is available)', async () => {
    // Wednesday 2026-03-11 at 14:00 (14h ≥ 11) → today is a valid start date
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-11T14:00:00'))

    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    // The first date passed to the API should be 20260311 (today, Wednesday)
    const firstUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(firstUrl).toContain('searchdate=20260311')
  })

  it('starts from yesterday when hour is before 11 (API not yet updated)', async () => {
    // Wednesday 2026-03-11 at 09:00 (9h < 11) → start from yesterday (Tuesday 20260310)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-11T09:00:00'))

    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const firstUrl = fetchSpy.mock.calls[0]?.[0] as string
    expect(firstUrl).toContain('searchdate=20260310')
  })

  it('skips Sunday when building business date list', async () => {
    // 2026-03-08 is a Sunday at 14:00 → should skip to Friday 20260306
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T14:00:00'))

    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    // All requested searchdate values must not be a Sunday (20260308)
    const calledUrls = fetchSpy.mock.calls.map((c) => c[0] as string)
    const hasSunday = calledUrls.some((u) => u.includes('searchdate=20260308'))
    expect(hasSunday).toBe(false)
  })

  it('skips Saturday when building business date list', async () => {
    // 2026-03-07 is a Saturday at 14:00 → should skip to Friday 20260306
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-07T14:00:00'))

    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const calledUrls = fetchSpy.mock.calls.map((c) => c[0] as string)
    const hasSaturday = calledUrls.some((u) => u.includes('searchdate=20260307'))
    expect(hasSaturday).toBe(false)
  })

  it('generates up to 5 business dates in parallel', async () => {
    // Wednesday 2026-03-11 14:00 — all 5 dates should be tried simultaneously
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-11T14:00:00'))

    // All calls return no data so all 5 dates are tried
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    } as Response)

    await refreshExchangeRate()

    // Each date triggers: oapi attempt + www fallback attempt = up to 10 fetch calls
    // But Promise.any resolves on first success; since all return [], all 5 dates
    // run their two fetches. Minimum: 5 dates × 1 oapi call each = 5 calls.
    // (www fallback is only triggered per date when oapi returns null)
    // With empty [], oapi returns null → www is tried → 5×2 = 10 calls total.
    // We verify at least 5 unique searchdate values were tried.
    const calledUrls = (global.fetch as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (c: unknown[]) => c[0] as string,
    )
    const searchDates = new Set(
      calledUrls.map((u: string) => {
        const match = u.match(/searchdate=(\d{8})/)
        return match?.[1]
      }),
    )
    expect(searchDates.size).toBeGreaterThanOrEqual(5)
  })

  it('formats dates as YYYYMMDD in the API request URL', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-05T14:00:00')) // Monday, January 5

    const fetchSpy = mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const firstUrl = fetchSpy.mock.calls[0]?.[0] as string
    // Should be 20260105 — zero-padded month and day
    expect(firstUrl).toMatch(/searchdate=2026010\d/)
  })
})

// ===========================================================================
// fetchFromUrl — tested indirectly through getUSDKRWRate
// ===========================================================================

describe('fetchFromUrl — HTTP error handling', () => {
  it('returns null for HTTP 4xx and falls through to 1350 fallback', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockFetchHttpError(404)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })

  it('returns null for HTTP 5xx and falls through to 1350 fallback', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockFetchHttpError(500)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })

  it('handles network-level throw and falls through to 1350 fallback', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockFetchNetworkError()

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })

  it('returns null when deal_bas_r is NaN after comma removal', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([{ cur_unit: 'USD', cur_nm: '미국 달러', deal_bas_r: 'N/A', result: 1 }]),
    } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })

  it('returns null when deal_bas_r is zero or negative', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([{ cur_unit: 'USD', cur_nm: '미국 달러', deal_bas_r: '0', result: 1 }]),
    } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1350)
  })
})

// ===========================================================================
// getExchangeRateInfo
// ===========================================================================

describe('getExchangeRateInfo', () => {
  it('returns rate with source, timestamp, and isStale fields', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate() // prime memory cache

    const info = await getExchangeRateInfo()

    expect(info).toHaveProperty('rate')
    expect(info).toHaveProperty('source')
    expect(info).toHaveProperty('timestamp')
    expect(info).toHaveProperty('isStale')
  })

  it('returns isStale=false immediately after a successful fetch', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const info = await getExchangeRateInfo()

    expect(info.isStale).toBe(false)
  })

  it('returns isStale=true when cached timestamp is older than 1 hour', async () => {
    vi.useFakeTimers()
    const past = Date.now()
    vi.setSystemTime(past)

    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    // Advance time by 61 minutes
    vi.advanceTimersByTime(61 * 60 * 1000)

    const info = await getExchangeRateInfo()

    expect(info.isStale).toBe(true)
  })

  it('returns source="koreaexim" after a successful API fetch', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const info = await getExchangeRateInfo()

    expect(info.source).toBe('koreaexim')
  })

  it('returns a numeric rate matching getUSDKRWRate', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,425.00'))
    const rate = await refreshExchangeRate()

    const info = await getExchangeRateInfo()

    expect(info.rate).toBe(rate)
    expect(info.rate).toBe(1425)
  })

  it('returns source="fallback" and rate=1350 when no cache and all APIs fail', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockFetchNetworkError()

    // Clear memory cache
    await refreshExchangeRate()
    // Now call getExchangeRateInfo — memoryCache is null (fallback was returned but
    // the module doesn't set memoryCache on fallback), so it will call getUSDKRWRate again
    mockFetchNetworkError() // for the getExchangeRateInfo → getUSDKRWRate call

    const info = await getExchangeRateInfo()

    expect(info.rate).toBe(1350)
    expect(info.source).toBe('fallback')
  })

  it('returns timestamp as a number (milliseconds since epoch)', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const info = await getExchangeRateInfo()

    expect(typeof info.timestamp).toBe('number')
    expect(info.timestamp).toBeGreaterThan(0)
  })
})

// ===========================================================================
// refreshExchangeRate
// ===========================================================================

describe('refreshExchangeRate', () => {
  it('clears memory cache and re-fetches from API', async () => {
    // Prime cache with rate 1380
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    // Change API to return a different rate
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeKoreaEximResponse('1,400.00')),
    } as Response)

    // refreshExchangeRate should bypass memory cache
    const fresh = await refreshExchangeRate()

    expect(fresh).toBe(1400)
  })

  it('hits the network even when memory cache is still valid', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))
    await refreshExchangeRate()

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeKoreaEximResponse('1,410.00')),
    } as Response)

    await refreshExchangeRate()

    expect(fetchSpy).toHaveBeenCalled()
  })

  it('returns the newly fetched rate, not the previously cached rate', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,300.00'))
    await refreshExchangeRate()

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeKoreaEximResponse('1,500.00')),
    } as Response)

    const rate = await refreshExchangeRate()

    expect(rate).toBe(1500)
    expect(rate).not.toBe(1300)
  })

  it('returns a number', async () => {
    mockFetchSuccess(makeKoreaEximResponse('1,380.00'))

    const rate = await refreshExchangeRate()

    expect(typeof rate).toBe('number')
  })
})
