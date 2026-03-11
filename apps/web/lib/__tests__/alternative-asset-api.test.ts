import { beforeEach, describe, expect, it, vi } from 'vitest'
import { searchAlternativeAssets } from '../alternative-asset-api'

// ============================================
// searchAlternativeAssets — pure, synchronous
// ============================================

describe('searchAlternativeAssets', () => {
  it('matches by Korean name "비트코인"', () => {
    const results = searchAlternativeAssets('비트코인')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('BTC')
  })

  it('matches by English name "bitcoin" (case-insensitive)', () => {
    const results = searchAlternativeAssets('bitcoin')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('BTC')
  })

  it('matches by ticker code "btc" (case-insensitive)', () => {
    const results = searchAlternativeAssets('btc')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('BTC')
  })

  it('matches by partial Korean name "비트"', () => {
    const results = searchAlternativeAssets('비트')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('BTC')
  })

  it('matches "금" and returns GOLD', () => {
    const results = searchAlternativeAssets('금')
    expect(results.some((a) => a.code === 'GOLD')).toBe(true)
  })

  it('matches "gold" and returns GOLD', () => {
    const results = searchAlternativeAssets('gold')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('GOLD')
  })

  it('returns [] for an empty query', () => {
    expect(searchAlternativeAssets('')).toEqual([])
  })

  it('returns [] for a query with no matching asset', () => {
    expect(searchAlternativeAssets('xyz')).toEqual([])
  })

  it('returns price = 0 when the memory cache is empty', () => {
    // No getAlternativeAssetPrices() has been called → memoryCache is null
    const results = searchAlternativeAssets('bitcoin')
    expect(results).toHaveLength(1)
    expect(results[0]!.price).toBe(0)
  })

  it('matches "sol" and returns SOL_CRYPTO', () => {
    const results = searchAlternativeAssets('sol')
    expect(results).toHaveLength(1)
    expect(results[0]!.code).toBe('SOL_CRYPTO')
  })
})

// ============================================
// getAlternativeAssetPrices — async, uses fetch
// ============================================

// Each test in this describe block calls vi.resetModules() then dynamically
// imports the module so that the module-level memoryCache variable starts
// as null for every test (no shared state between tests).

const MOCK_CSV = `,비트코인,"₩137,500,000"
,이더리움,"₩3,200,000"
,리플,"₩850"
,솔라나,"₩180,000"
,금(1g),"₩120,000"`

describe('getAlternativeAssetPrices', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('parses valid CSV and returns correct asset prices', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: 'https://docs.google.com/spreadsheets/...',
      text: () => Promise.resolve(MOCK_CSV),
    } as unknown as Response)

    const { getAlternativeAssetPrices } = await import('../alternative-asset-api')
    const assets = await getAlternativeAssetPrices()

    expect(assets.length).toBeGreaterThanOrEqual(1)

    const btc = assets.find((a) => a.code === 'BTC')
    expect(btc).toBeDefined()
    expect(btc?.price).toBe(137500000)
    expect(btc?.currency).toBe('KRW')

    const eth = assets.find((a) => a.code === 'ETH')
    expect(eth?.price).toBe(3200000)

    const xrp = assets.find((a) => a.code === 'XRP')
    expect(xrp?.price).toBe(850)

    const sol = assets.find((a) => a.code === 'SOL_CRYPTO')
    expect(sol?.price).toBe(180000)

    const gold = assets.find((a) => a.code === 'GOLD')
    expect(gold?.price).toBe(120000)
  })

  it('strips ₩ symbol and commas from price strings', async () => {
    const csv = `,비트코인,"₩137,500,000"`

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: 'https://docs.google.com/spreadsheets/...',
      text: () => Promise.resolve(csv),
    } as unknown as Response)

    const { getAlternativeAssetPrices } = await import('../alternative-asset-api')
    const assets = await getAlternativeAssetPrices()
    const btc = assets.find((a) => a.code === 'BTC')
    expect(btc?.price).toBe(137500000)
  })

  it('returns [] when fetch fails with a network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const { getAlternativeAssetPrices } = await import('../alternative-asset-api')
    const assets = await getAlternativeAssetPrices()
    expect(assets).toEqual([])
  })

  it('returns [] when the HTTP response is not ok', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      url: 'https://docs.google.com/spreadsheets/...',
    } as unknown as Response)

    const { getAlternativeAssetPrices } = await import('../alternative-asset-api')
    const assets = await getAlternativeAssetPrices()
    expect(assets).toEqual([])
  })

  it('returns cached data without re-fetching within the cache window', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://docs.google.com/spreadsheets/...',
      text: () => Promise.resolve(MOCK_CSV),
    } as unknown as Response)

    const { getAlternativeAssetPrices } = await import('../alternative-asset-api')

    // First call — populates cache
    await getAlternativeAssetPrices()
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // Second call — should use memory cache, no additional fetch
    await getAlternativeAssetPrices()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
