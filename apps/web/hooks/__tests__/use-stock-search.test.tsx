import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStockSearch } from '../use-stock-search'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useStockSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial state with empty query, results, not searching, no selected stock', () => {
    const { result } = renderHook(() => useStockSearch())

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
    expect(result.current.showResults).toBe(false)
    expect(result.current.selectedStock).toBeNull()
  })

  it('handleQueryChange triggers search after debounce', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({ stocks: [{ code: '005930', name: '삼성전자', market: 'KOSPI' }] }),
    } as Response)

    const { result } = renderHook(() => useStockSearch({ debounceMs: 300 }))

    act(() => {
      result.current.handleQueryChange('삼성')
    })

    expect(result.current.query).toBe('삼성')
    expect(mockFetch).not.toHaveBeenCalled()

    // Advance time and flush all microtasks/promises
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/stocks/search?q=%EC%82%BC%EC%84%B1')
  })

  it('Korean 1 char minimum: single Korean character triggers search', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ stocks: [] }),
    } as Response)

    const { result } = renderHook(() => useStockSearch())

    act(() => {
      result.current.handleQueryChange('삼')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('English 1 char does not trigger search, but 2 chars does', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ stocks: [] }),
    } as Response)

    const { result } = renderHook(() => useStockSearch())

    // Single English char — should NOT search
    act(() => {
      result.current.handleQueryChange('A')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(mockFetch).not.toHaveBeenCalled()

    // Two English chars — should search
    act(() => {
      result.current.handleQueryChange('AP')
    })

    await act(async () => {
      vi.advanceTimersByTime(300)
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith('/api/stocks/search?q=AP')
  })

  it('handleSelect updates selectedStock and formats query as "name (code)"', () => {
    const onSelect = vi.fn()
    const { result } = renderHook(() => useStockSearch({ onSelect }))

    const stock = { code: '005930', name: '삼성전자', market: 'KOSPI' }

    act(() => {
      result.current.handleSelect(stock)
    })

    expect(result.current.selectedStock).toEqual(stock)
    expect(result.current.query).toBe('삼성전자 (005930)')
    expect(result.current.showResults).toBe(false)
    expect(result.current.results).toEqual([])
    expect(onSelect).toHaveBeenCalledWith(stock)
  })

  it('clearSelection resets all state', () => {
    const { result } = renderHook(() => useStockSearch())

    const stock = { code: '005930', name: '삼성전자', market: 'KOSPI' }

    act(() => {
      result.current.handleSelect(stock)
    })

    act(() => {
      result.current.clearSelection()
    })

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.showResults).toBe(false)
    expect(result.current.selectedStock).toBeNull()
  })

  it('reset clears everything including pending timers', async () => {
    const { result } = renderHook(() => useStockSearch())

    act(() => {
      result.current.handleQueryChange('삼성전자')
    })

    // Reset before debounce fires
    act(() => {
      result.current.reset()
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // fetch should not have been called since reset cancelled the timer
    expect(mockFetch).not.toHaveBeenCalled()

    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.isSearching).toBe(false)
    expect(result.current.showResults).toBe(false)
    expect(result.current.selectedStock).toBeNull()
  })
})
