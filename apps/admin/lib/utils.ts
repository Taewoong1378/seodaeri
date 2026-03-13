export function formatCurrency(value: number, currency = "KRW"): string {
  if (currency === "USD") {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// Chart color palette
export const CHART_COLORS = {
  blue: "#3b82f6",
  purple: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  pink: "#ec4899",
  teal: "#14b8a6",
  orange: "#f97316",
} as const;

export const CHART_COLOR_ARRAY = Object.values(CHART_COLORS);

// Get color by index (cycles)
export function getChartColor(index: number): string {
  return CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length] ?? "#3b82f6";
}

// Check if ticker is likely ETF (Korean ETF names often contain specific patterns)
export function isETF(name: string | null, ticker: string): boolean {
  if (!name) return false;
  const etfPatterns = [
    "ETF",
    "etf",
    "KODEX",
    "TIGER",
    "KBSTAR",
    "SOL",
    "ACE",
    "HANARO",
    "ARIRANG",
    "KOSEF",
    "TIMEFOLIO",
    "PLUS",
  ];
  // US ETFs: 3-4 letter tickers that match known ETF patterns
  const usEtfTickers = [
    "SPY",
    "QQQ",
    "IVV",
    "VOO",
    "VTI",
    "SCHD",
    "VEA",
    "IEFA",
    "AGG",
    "BND",
    "VWO",
    "VIG",
    "VYM",
    "IWM",
    "EFA",
    "GLD",
    "TLT",
    "XLK",
    "DIA",
    "ARKK",
    "JEPI",
    "JEPQ",
    "TQQQ",
    "SOXL",
    "SOXS",
  ];
  return (
    etfPatterns.some((p) => name.includes(p)) || usEtfTickers.includes(ticker)
  );
}

// Determine if holding is KR or US based on currency
export function getMarket(currency: string): "한국" | "미국" {
  return currency === "KRW" ? "한국" : "미국";
}

// Group data by week (returns YYYY-WW format key)
export function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
  );
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

// Group data by date (YYYY-MM-DD)
export function getDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().split("T")[0] ?? "";
}

// Convert array to CSV string
export function arrayToCsv(headers: string[], rows: string[][]): string {
  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const headerLine = headers.map(escapeCsv).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsv).join(","));
  return [headerLine, ...dataLines].join("\n");
}
