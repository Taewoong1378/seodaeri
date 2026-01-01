/**
 * 미국 주식 데이터 (NASDAQ CSV 기반)
 * - NASDAQ 공식 Stock Screener에서 다운로드한 CSV 파일 사용
 * - https://www.nasdaq.com/market-activity/stocks/screener
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface USStock {
  code: string; // 티커 심볼 (예: AAPL)
  name: string; // 종목명 (예: Apple Inc.)
  market: string; // 거래소 (NASDAQ, NYSE, AMEX)
  sector?: string; // 섹터
  industry?: string; // 산업
}

interface CSVRow {
  Symbol: string;
  Name: string;
  "Last Sale": string;
  "Net Change": string;
  "% Change": string;
  "Market Cap": string;
  Country: string;
  "IPO Year": string;
  Volume: string;
  Sector: string;
  Industry: string;
}

/**
 * CSV 파일 파싱
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split("\n");
  const headers = lines[0]?.split(",") || [];

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line?.trim()) continue;

    // CSV 파싱 (쉼표가 포함된 값 처리)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index] || "";
      });
      rows.push(row as unknown as CSVRow);
    }
  }

  return rows;
}

/**
 * CSV 파일에서 미국 주식 목록 로드
 */
export async function fetchUSStocks(): Promise<USStock[]> {
  const dataDir = join(process.cwd(), "data");
  const files = [
    { path: join(dataDir, "nasdaq.csv"), market: "NASDAQ" },
    { path: join(dataDir, "nyse.csv"), market: "NYSE" },
    { path: join(dataDir, "amex.csv"), market: "AMEX" },
  ];

  const allStocks: USStock[] = [];
  const seenCodes = new Set<string>();

  for (const file of files) {
    try {
      console.log(`[US Stocks] Loading ${file.path}...`);
      const content = readFileSync(file.path, "utf-8");
      const rows = parseCSV(content);

      console.log(`[US Stocks] Parsed ${rows.length} rows from ${file.market}`);

      for (const row of rows) {
        const symbol = row.Symbol?.trim().toUpperCase();
        const name = row.Name?.trim();

        // 유효성 검사
        if (!symbol || !name) continue;
        // 이미 추가된 종목 스킵 (중복 제거)
        if (seenCodes.has(symbol)) continue;
        // 유효한 심볼만 (1~5글자, 알파벳만, 점/숫자 제외)
        if (!/^[A-Z]{1,5}$/.test(symbol)) continue;

        seenCodes.add(symbol);
        allStocks.push({
          code: symbol,
          name: name
            .replace(" Common Stock", "")
            .replace(" Class A", "")
            .trim(),
          market: file.market,
          sector: row.Sector || undefined,
          industry: row.Industry || undefined,
        });
      }
    } catch (error) {
      console.error(`[US Stocks] Error loading ${file.path}:`, error);
    }
  }

  console.log(`[US Stocks] Total unique stocks: ${allStocks.length}`);
  return allStocks;
}

/**
 * 미국 종목 검색 (로컬 CSV 데이터에서)
 */
export async function searchUSStocksLocal(
  query: string,
  limit = 20
): Promise<USStock[]> {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const q = query.trim().toUpperCase();
  const stocks = await fetchUSStocks();

  return stocks
    .filter(
      (stock) => stock.code.includes(q) || stock.name.toUpperCase().includes(q)
    )
    .slice(0, limit);
}
