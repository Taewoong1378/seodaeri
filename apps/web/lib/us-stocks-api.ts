/**
 * 미국 주식 데이터 (NASDAQ CSV 기반)
 * - NASDAQ 공식 Stock Screener에서 다운로드한 CSV 파일 사용
 * - https://www.nasdaq.com/market-activity/stocks/screener
 * - downloadUSStockCSVs()로 최신 CSV를 NASDAQ API에서 다운로드 가능
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
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
 * NASDAQ API에서 최신 주식 데이터를 다운로드하여 CSV 파일로 저장
 * - NASDAQ Stock Screener의 내부 API 사용
 * - NASDAQ, NYSE, AMEX 3개 거래소 데이터 다운로드
 * 
 * @returns 다운로드 결과 (거래소별 종목 수)
 */
export async function downloadUSStockCSVs(): Promise<{
  success: boolean;
  message: string;
  counts: { nasdaq: number; nyse: number; amex: number };
  error?: string;
}> {
  const exchanges = [
    { name: "nasdaq", label: "NASDAQ" },
    { name: "nyse", label: "NYSE" },
    { name: "amex", label: "AMEX" },
  ] as const;

  const dataDir = join(process.cwd(), "data");
  
  // data 디렉토리가 없으면 생성
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const counts: { nasdaq: number; nyse: number; amex: number } = {
    nasdaq: 0,
    nyse: 0,
    amex: 0,
  };

  const errors: string[] = [];

  for (const exchange of exchanges) {
    try {
      console.log(`[downloadCSV] Fetching ${exchange.label} data from NASDAQ API...`);

      // NASDAQ Stock Screener 내부 API
      const url = `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25000&exchange=${exchange.name}`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rows = data?.data?.table?.rows;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        throw new Error("API 응답에 데이터가 없습니다.");
      }

      console.log(`[downloadCSV] ${exchange.label}: ${rows.length} rows received`);

      // JSON → CSV 변환
      const csvHeaders = [
        "Symbol", "Name", "Last Sale", "Net Change", "% Change",
        "Market Cap", "Country", "IPO Year", "Volume", "Sector", "Industry",
      ];
      
      const csvLines = [csvHeaders.join(",")];
      
      for (const row of rows) {
        const values = [
          row.symbol || "",
          `"${(row.name || "").replace(/"/g, '""')}"`,
          row.lastsale || "",
          row.netchange || "",
          row.pctchange || "",
          row.marketCap || "",
          `"${(row.country || "").replace(/"/g, '""')}"`,
          row.ipoyear || "",
          row.volume || "",
          `"${(row.sector || "").replace(/"/g, '""')}"`,
          `"${(row.industry || "").replace(/"/g, '""')}"`,
        ];
        csvLines.push(values.join(","));
      }

      const csvContent = csvLines.join("\n");
      const filePath = join(dataDir, `${exchange.name}.csv`);
      
      writeFileSync(filePath, csvContent, "utf-8");
      counts[exchange.name] = rows.length;

      console.log(`[downloadCSV] ${exchange.label}: saved to ${filePath}`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[downloadCSV] ${exchange.label} error:`, errMsg);
      errors.push(`${exchange.label}: ${errMsg}`);
    }
  }

  const totalCount = counts.nasdaq + counts.nyse + counts.amex;

  if (totalCount === 0) {
    return {
      success: false,
      message: "모든 거래소 데이터 다운로드 실패",
      counts,
      error: errors.join("; "),
    };
  }

  const message = errors.length > 0
    ? `${totalCount}개 종목 다운로드 완료 (일부 실패: ${errors.join(", ")})`
    : `${totalCount}개 종목 CSV 다운로드 완료 (NASDAQ: ${counts.nasdaq}, NYSE: ${counts.nyse}, AMEX: ${counts.amex})`;

  return {
    success: true,
    message,
    counts,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
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
