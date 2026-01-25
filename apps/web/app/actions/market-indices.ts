'use server';

import { getAllMajorIndices, type IndexData } from '../../lib/index-data-api';
import { getExchangeRateInfo } from '../../lib/exchange-rate-api';

export interface MarketIndexItem {
  name: string;
  nameKr: string;
  price: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

export interface MarketIndicesResult {
  success: boolean;
  indices: MarketIndexItem[];
  exchangeRate: MarketIndexItem | null;
  updatedAt: string;
  error?: string;
}

/**
 * 주요 시장지수 및 환율 조회
 * - KOSPI, KOSDAQ (한국투자증권 API)
 * - S&P500, NASDAQ (한국투자증권 API - ETF 기반)
 * - USD/KRW 환율 (한국수출입은행 API)
 */
export async function getMarketIndices(): Promise<MarketIndicesResult> {
  try {
    // 병렬로 지수와 환율 조회
    const [indicesData, exchangeRateData] = await Promise.all([
      getAllMajorIndices(),
      getExchangeRateInfo(),
    ]);

    const indices: MarketIndexItem[] = [];

    // KOSPI
    if (indicesData.kospi) {
      indices.push(transformIndexData(indicesData.kospi, '코스피'));
    }

    // KOSDAQ
    if (indicesData.kosdaq) {
      indices.push(transformIndexData(indicesData.kosdaq, '코스닥'));
    }

    // S&P500
    if (indicesData.sp500) {
      indices.push(transformIndexData(indicesData.sp500, 'S&P 500'));
    }

    // NASDAQ
    if (indicesData.nasdaq) {
      indices.push(transformIndexData(indicesData.nasdaq, '나스닥'));
    }

    // 환율
    let exchangeRate: MarketIndexItem | null = null;
    if (exchangeRateData.rate) {
      // 환율은 변동 정보가 없으므로 별도 처리
      exchangeRate = {
        name: 'USD/KRW',
        nameKr: '원/달러',
        price: exchangeRateData.rate,
        change: 0,
        changePercent: 0,
        isPositive: true,
      };
    }

    return {
      success: true,
      indices,
      exchangeRate,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[getMarketIndices] Error:', error);
    return {
      success: false,
      indices: [],
      exchangeRate: null,
      updatedAt: new Date().toISOString(),
      error: '시장 데이터를 불러오는데 실패했습니다.',
    };
  }
}

function transformIndexData(data: IndexData, nameKr: string): MarketIndexItem {
  return {
    name: data.name,
    nameKr,
    price: data.price,
    change: Math.abs(data.change),
    changePercent: Math.abs(data.changePercent),
    isPositive: data.change >= 0,
  };
}
