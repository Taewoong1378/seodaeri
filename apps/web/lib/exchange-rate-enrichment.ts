/**
 * Exchange Rate Enrichment Utility
 *
 * Calculates dollar-applied values and injects them into row data arrays
 * from Google Sheets range G17:AB200.
 *
 * Row structure (G=index 0):
 * - index 0 (G): date in "YY.MM" format (e.g., "25.01")
 * - index 8 (O): 계좌종합 지수 (account composite index, 100 base)
 * - index 9 (P): 코스피 지수 (KOSPI index, 100 base)
 * - index 10 (Q): S&P500 지수 (100 base, USD denominated)
 * - index 11 (R): NASDAQ 지수 (100 base, USD denominated)
 *
 * Enrichment target indices:
 * - index 23 (AD): raw exchange rate value
 * - index 28 (AI): sp500_idx * dollar_idx / 100
 * - index 29 (AJ): nasdaq_idx * dollar_idx / 100
 * - index 33 (AN): dollar_idx = (rate / baseRate) * 100
 * - index 34 (AO): sp500_idx * dollar_idx / 100
 * - index 35 (AP): nasdaq_idx * dollar_idx / 100
 */

import type { HistoricalMarketData } from './historical-exchange-rate';

/**
 * 기본 지수 행 데이터에 달러환율 적용 값을 계산하여 주입
 *
 * @param rows - G17:AB200 범위의 행 데이터 (index 0~21)
 * @param exchangeRates - Map<"YY.MM", USD/KRW rate> from getHistoricalExchangeRates()
 * @param currentRate - 현재 USD/KRW 환율 from getUSDKRWRate()
 * @returns 달러환율 적용 값이 주입된 행 데이터 (index 0~35)
 */
export function enrichRowsWithExchangeRates(
  rows: any[],
  exchangeRates: Map<string, number>,
  currentRate: number
): any[] {
  // If exchange rates map is empty, return original rows (graceful degradation)
  if (!exchangeRates || exchangeRates.size === 0) {
    return rows;
  }

  // Find baseRate: the exchange rate of the first valid date row (investment start month)
  let baseRate = 0;
  for (const row of rows) {
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    const dateCell = String(row[0] || '').trim();
    if (!/^\d{2}\.\d{2}$/.test(dateCell)) continue;

    const rate = exchangeRates.get(dateCell);
    if (rate && rate > 0) {
      baseRate = rate;
      break;
    }
  }

  // If no base rate found, try the earliest available rate in the map
  if (baseRate === 0) {
    const sortedKeys = Array.from(exchangeRates.keys()).sort();
    for (const key of sortedKeys) {
      const rate = exchangeRates.get(key);
      if (rate && rate > 0) {
        baseRate = rate;
        break;
      }
    }
  }

  // If still no base rate, return original rows
  if (baseRate === 0) {
    return rows;
  }

  // Enrich each row
  return rows.map(row => {
    if (!row || !Array.isArray(row)) return row;

    const dateCell = String(row[0] || '').trim();
    if (!/^\d{2}\.\d{2}$/.test(dateCell)) return row;

    // Get exchange rate for this month
    const rate = exchangeRates.get(dateCell) || currentRate;
    if (!rate || rate <= 0) return row;

    // Parse existing index values
    const parseNum = (val: any): number => {
      if (!val) return 0;
      const str = String(val).replace(/[₩$,\s]/g, '');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    const sp500Idx = parseNum(row[10]); // Q열: S&P500 index (100 base)
    const nasdaqIdx = parseNum(row[11]); // R열: NASDAQ index (100 base)

    // Calculate dollar index (100 base)
    const dollarIdx = (rate / baseRate) * 100;

    // Calculate dollar-applied indices
    const sp500DollarIdx = sp500Idx * dollarIdx / 100;
    const nasdaqDollarIdx = nasdaqIdx * dollarIdx / 100;

    // Create extended row (ensure array is long enough)
    const enrichedRow = [...row];
    while (enrichedRow.length <= 35) {
      enrichedRow.push(undefined);
    }

    // Inject values
    enrichedRow[23] = rate;                    // AD: raw exchange rate
    enrichedRow[28] = sp500DollarIdx;          // AI: S&P500 dollar-applied
    enrichedRow[29] = nasdaqDollarIdx;         // AJ: NASDAQ dollar-applied
    enrichedRow[33] = dollarIdx;               // AN: dollar index (100 base)
    enrichedRow[34] = sp500DollarIdx;          // AO: S&P500 dollar index
    enrichedRow[35] = nasdaqDollarIdx;         // AP: NASDAQ dollar index

    return enrichedRow;
  });
}

/**
 * 시장 데이터에서 월별 수익률 계산
 * 작년 12월 가격을 baseline으로, 각 월별 (price / baseline - 1) * 100
 *
 * @param months - ["시작", "1월", "2월", ...] 형식의 월 레이블
 * @param marketData - HistoricalMarketData from getHistoricalMarketData()
 * @param currentYear - 현재 연도 (예: 2026)
 * @returns gold/bitcoin/realEstate/dollar 수익률 배열
 */
export function calculateMarketYields(
  months: string[],
  marketData: HistoricalMarketData,
  currentYear: number
): { gold: number[]; bitcoin: number[]; realEstate: number[]; dollar: number[] } {
  const yearStr = String(currentYear).slice(-2); // "26"
  const prevYearStr = String(currentYear - 1).slice(-2); // "25"
  const baselineKey = `${prevYearStr}.12`; // 작년 12월

  // 각 시리즈의 baseline 값
  const goldBaseline = marketData.gold.get(baselineKey);
  const btcBaseline = marketData.bitcoin.get(baselineKey);
  const reBaseline = marketData.realEstate.get(baselineKey);
  const dollarBaseline = marketData.exchangeRates.get(baselineKey);

  const goldYields: number[] = [0]; // 시작점 0%
  const btcYields: number[] = [0];
  const reYields: number[] = [0];
  const dollarYields: number[] = [0];

  // months[0] = "시작", months[1] = "1월", ...
  for (let i = 1; i < months.length; i++) {
    const monthKey = `${yearStr}.${String(i).padStart(2, '0')}`;

    // 금
    const goldVal = marketData.gold.get(monthKey);
    if (goldBaseline && goldBaseline > 0 && goldVal && goldVal > 0) {
      goldYields.push(Number(((goldVal / goldBaseline - 1) * 100).toFixed(1)));
    } else {
      goldYields.push(goldYields[goldYields.length - 1] ?? 0);
    }

    // 비트코인
    const btcVal = marketData.bitcoin.get(monthKey);
    if (btcBaseline && btcBaseline > 0 && btcVal && btcVal > 0) {
      btcYields.push(Number(((btcVal / btcBaseline - 1) * 100).toFixed(1)));
    } else {
      btcYields.push(btcYields[btcYields.length - 1] ?? 0);
    }

    // 부동산
    const reVal = marketData.realEstate.get(monthKey);
    if (reBaseline && reBaseline > 0 && reVal && reVal > 0) {
      reYields.push(Number(((reVal / reBaseline - 1) * 100).toFixed(1)));
    } else {
      reYields.push(reYields[reYields.length - 1] ?? 0);
    }

    // 달러
    const dollarVal = marketData.exchangeRates.get(monthKey);
    if (dollarBaseline && dollarBaseline > 0 && dollarVal && dollarVal > 0) {
      dollarYields.push(Number(((dollarVal / dollarBaseline - 1) * 100).toFixed(1)));
    } else {
      dollarYields.push(dollarYields[dollarYields.length - 1] ?? 0);
    }
  }

  return {
    gold: goldYields,
    bitcoin: btcYields,
    realEstate: reYields,
    dollar: dollarYields,
  };
}
