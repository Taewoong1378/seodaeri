/**
 * 기타자산(암호화폐/금) 현재가 데이터 (구글 스프레드시트 기반)
 *
 * 공개 스프레드시트의 "기타자산 현재가" 시트(gid=282782223)에서 데이터를 조회합니다.
 * - Row 4: 비트코인 (column B=name, column C=price in KRW)
 * - Row 5: 이더리움
 * - Row 6: 리플
 * - Row 7: 솔라나
 * - Row 9: 금(1g)
 */

const SPREADSHEET_ID = "1mhRnA1oB2OizL-jRtbBV-b2evYVJooMaVGyWIgQeBMM";
const SHEET_GID = "475830661";

// 5분 메모리 캐시
const CACHE_DURATION_MS = 5 * 60 * 1000;
let memoryCache: { data: AlternativeAsset[]; timestamp: number } | null = null;

export interface AlternativeAsset {
  code: string;     // "BTC", "ETH", "XRP", "SOL_CRYPTO", "GOLD"
  name: string;     // "비트코인", "이더리움", ...
  price: number;    // 원화 가격
  currency: 'KRW';
}

export const ALTERNATIVE_ASSET_CODES = new Set(['BTC', 'ETH', 'XRP', 'SOL_CRYPTO', 'GOLD']);

/**
 * 시트 이름 → 코드 및 검색 키워드 매핑
 */
const ASSET_DEFINITIONS: Array<{
  code: string;
  name: string;
  keywords: string[];
}> = [
  { code: 'BTC',        name: '비트코인', keywords: ['비트코인', 'bitcoin', 'btc'] },
  { code: 'ETH',        name: '이더리움', keywords: ['이더리움', 'ethereum', 'eth'] },
  { code: 'XRP',        name: '리플',     keywords: ['리플', 'ripple', 'xrp'] },
  { code: 'SOL_CRYPTO', name: '솔라나',   keywords: ['솔라나', 'solana', 'sol'] },
  { code: 'GOLD',       name: '금(1g)',   keywords: ['금', 'gold'] },
];

/**
 * CSV 행을 따옴표를 고려하여 필드로 분리
 * "1,069.02" 같은 따옴표 안의 쉼표를 필드 구분자로 처리하지 않음
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  return fields;
}

/**
 * column B의 이름 문자열로 자산 정의를 찾기
 */
function findAssetDefinition(nameInSheet: string) {
  const normalized = nameInSheet.toLowerCase().trim();
  return ASSET_DEFINITIONS.find((def) =>
    def.keywords.some((kw) => normalized.includes(kw.toLowerCase()))
  );
}

/**
 * CSV 텍스트에서 기타자산 현재가 파싱
 * Column B (index 1) = 자산명, Column C (index 2) = KRW 가격
 */
function parseAlternativeAssetCSV(csvText: string): AlternativeAsset[] {
  const assets: AlternativeAsset[] = [];
  const lines = csvText.split('\n');

  for (const line of lines) {
    if (!line) continue;
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const columns = parseCSVLine(trimmedLine);

    // Column B (index 1) = 자산명
    const nameInSheet = columns[1]?.trim() ?? '';
    if (!nameInSheet) continue;

    const def = findAssetDefinition(nameInSheet);
    if (!def) continue;

    // Column C (index 2) = KRW 가격 (₩, 쉼표, 따옴표 제거)
    const priceStr = columns[2]?.trim() ?? '';
    const price = Number.parseFloat(priceStr.replace(/[₩,"]/g, ''));

    if (Number.isNaN(price) || price <= 0) continue;

    // 중복 방지 (이미 같은 코드가 있으면 건너뜀)
    if (assets.some((a) => a.code === def.code)) continue;

    assets.push({
      code: def.code,
      name: def.name,
      price,
      currency: 'KRW',
    });
  }

  return assets;
}

/**
 * 공개 스프레드시트 "기타자산 현재가" 시트에서 CSV 데이터 조회
 */
async function fetchAlternativeAssetCSV(): Promise<AlternativeAsset[]> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

  console.log('[AlternativeAsset] Fetching from public spreadsheet, gid:', SHEET_GID);

  const response = await fetch(csvUrl, {
    cache: 'no-store', // 메모리 캐시로 충분 — Next.js fetch 캐시 비활성화
    redirect: 'follow',
  });

  console.log(`[AlternativeAsset] Response status: ${response.status}, url: ${response.url}`);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const csvText = await response.text();
  console.log(`[AlternativeAsset] CSV length: ${csvText.length}, first 200 chars: ${csvText.substring(0, 200)}`);

  const assets = parseAlternativeAssetCSV(csvText);

  console.log(`[AlternativeAsset] Parsed ${assets.length} assets:`, assets.map(a => `${a.code}=${a.price}`).join(', '));
  return assets;
}

/**
 * 기타자산(암호화폐/금) 현재가 조회 (5분 메모리 캐시)
 *
 * @returns AlternativeAsset[] - BTC, ETH, XRP, SOL_CRYPTO, GOLD 현재가 목록
 */
export async function getAlternativeAssetPrices(): Promise<AlternativeAsset[]> {
  // 메모리 캐시 확인
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
    console.log('[AlternativeAsset] Using memory cache');
    return memoryCache.data;
  }

  try {
    const assets = await fetchAlternativeAssetCSV();
    memoryCache = { data: assets, timestamp: Date.now() };
    return assets;
  } catch (error) {
    console.error('[AlternativeAsset] Failed to fetch prices:', error);
    return [];
  }
}

/**
 * 검색어로 기타자산 검색 (검색 API에서 사용)
 *
 * @param query - 검색어 (자산명 또는 코드)
 * @returns 매칭된 AlternativeAsset 목록 (캐시된 가격 포함, 없으면 price=0)
 */
export function searchAlternativeAssets(query: string): AlternativeAsset[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const matched = ASSET_DEFINITIONS.filter((def) =>
    def.keywords.some((kw) => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase())) ||
    def.code.toLowerCase().includes(q)
  );

  if (matched.length === 0) return [];

  // 캐시된 가격 사용 (없으면 price=0)
  const cached = memoryCache?.data ?? [];

  return matched.map((def) => {
    const live = cached.find((a) => a.code === def.code);
    return live ?? {
      code: def.code,
      name: def.name,
      price: 0,
      currency: 'KRW' as const,
    };
  });
}
