'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import { appendSheetData, deleteSheetRow, fetchSheetData } from '../../lib/google-sheets';

export interface DividendInput {
  date: string; // YYYY-MM-DD
  ticker: string;
  name: string;
  amountKRW: number;
  amountUSD: number;
}

export interface SaveDividendResult {
  success: boolean;
  error?: string;
}

/**
 * 배당내역을 Google Sheet에 저장
 * 시트 구조: 일자 | 연도 | 월 | 일 | 종목코드 | 종목명 | 원화 배당금 | 외화 배당금 | 원화환산
 */
export async function saveDividend(input: DividendInput): Promise<SaveDividendResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (!session.accessToken) {
    return { success: false, error: 'Google 인증이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from('users')
      .select('spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('spreadsheet_id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user?.spreadsheet_id) {
      return { success: false, error: '연동된 스프레드시트가 없습니다.' };
    }

    // 날짜 파싱 (YYYY-MM-DD)
    const dateParts = input.date.split('-');
    const year = dateParts[0] || '';
    const month = dateParts[1] || '';
    const day = dateParts[2] || '';

    // 원화환산 계산 (외화가 있으면 환율 적용)
    const exchangeRate = 1400; // USD to KRW
    const convertedKRW = input.amountUSD > 0 ? Math.round(input.amountUSD * exchangeRate) : 0;
    const totalKRW = input.amountKRW + convertedKRW;

    // 시트에 추가할 데이터
    // 구조: 일자 | 연도 | 월 | 일 | 종목코드 | 종목명 | 원화 배당금 | 외화 배당금 | 원화환산
    const rowData = [
      input.date, // A: 일자
      year, // B: 연도
      `${month}월`, // C: 월
      `${day}일`, // D: 일
      input.ticker, // E: 종목코드
      input.name || input.ticker, // F: 종목명
      input.amountKRW > 0 ? `₩${input.amountKRW.toLocaleString()}` : '', // G: 원화 배당금
      input.amountUSD > 0 ? input.amountUSD : '', // H: 외화 배당금
      totalKRW > 0 ? `₩${totalKRW.toLocaleString()}` : '', // I: 원화환산
    ];

    await appendSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'7. 배당내역'!A:I",
      [rowData]
    );

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    return { success: true };
  } catch (error: any) {
    console.error('saveDividend error:', error);

    // 더 구체적인 에러 메시지 반환
    const errorMessage = error?.message || error?.toString() || '알 수 없는 오류';

    if (error?.code === 401 || errorMessage.includes('401')) {
      return { success: false, error: '인증이 만료되었습니다. 다시 로그인해주세요.' };
    }
    if (error?.code === 403 || errorMessage.includes('403')) {
      return { success: false, error: '스프레드시트에 접근 권한이 없습니다.' };
    }
    if (error?.code === 404 || errorMessage.includes('404')) {
      return { success: false, error: '스프레드시트 또는 시트를 찾을 수 없습니다.' };
    }

    return { success: false, error: `저장 실패: ${errorMessage}` };
  }
}

/**
 * 여러 배당내역을 한번에 Google Sheet에 저장
 */
export async function saveDividends(inputs: DividendInput[]): Promise<SaveDividendResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (!session.accessToken) {
    return { success: false, error: 'Google 인증이 필요합니다.' };
  }

  if (inputs.length === 0) {
    return { success: false, error: '저장할 배당내역이 없습니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from('users')
      .select('spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('spreadsheet_id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user?.spreadsheet_id) {
      return { success: false, error: '연동된 스프레드시트가 없습니다.' };
    }

    const exchangeRate = 1400; // USD to KRW

    // 모든 배당내역을 행 데이터로 변환
    const rows = inputs.map((input) => {
      const dateParts = input.date.split('-');
      const year = dateParts[0] || '';
      const month = dateParts[1] || '';
      const day = dateParts[2] || '';

      const convertedKRW = input.amountUSD > 0 ? Math.round(input.amountUSD * exchangeRate) : 0;
      const totalKRW = input.amountKRW + convertedKRW;

      return [
        input.date, // A: 일자
        year, // B: 연도
        `${month}월`, // C: 월
        `${day}일`, // D: 일
        input.ticker, // E: 종목코드
        input.name || input.ticker, // F: 종목명
        input.amountKRW > 0 ? `₩${input.amountKRW.toLocaleString()}` : '', // G: 원화 배당금
        input.amountUSD > 0 ? input.amountUSD : '', // H: 외화 배당금
        totalKRW > 0 ? `₩${totalKRW.toLocaleString()}` : '', // I: 원화환산
      ];
    });

    // 한번에 여러 행 추가
    await appendSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'7. 배당내역'!A:I",
      rows
    );

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    return { success: true };
  } catch (error: any) {
    console.error('saveDividends error:', error);

    // 더 구체적인 에러 메시지 반환
    const errorMessage = error?.message || error?.toString() || '알 수 없는 오류';

    if (error?.code === 401 || errorMessage.includes('401')) {
      return { success: false, error: '인증이 만료되었습니다. 다시 로그인해주세요.' };
    }
    if (error?.code === 403 || errorMessage.includes('403')) {
      return { success: false, error: '스프레드시트에 접근 권한이 없습니다.' };
    }
    if (error?.code === 404 || errorMessage.includes('404')) {
      return { success: false, error: '스프레드시트 또는 시트를 찾을 수 없습니다.' };
    }

    return { success: false, error: `저장 실패: ${errorMessage}` };
  }
}

export interface DeleteDividendInput {
  date: string;      // YYYY-MM-DD
  ticker: string;
  amountKRW: number;
  amountUSD: number;
}

// 날짜 파싱 헬퍼 (시리얼 넘버 및 다양한 형식 지원)
function parseSheetDate(val: any): string | null {
  if (!val) return null;

  // 시리얼 넘버 처리 (Google Sheets는 숫자로 날짜를 저장)
  if (typeof val === 'number' && val > 30000 && val < 100000) {
    const date = new Date((val - 25569) * 86400 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(val).trim();

  // YYYY/MM/DD 또는 YYYY-MM-DD 형식
  const match1 = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (match1) {
    return `${match1[1]}-${match1[2]?.padStart(2, '0')}-${match1[3]?.padStart(2, '0')}`;
  }

  // MM/DD/YYYY 형식
  const match2 = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match2) {
    return `${match2[3]}-${match2[1]?.padStart(2, '0')}-${match2[2]?.padStart(2, '0')}`;
  }

  return null;
}

// 숫자 파싱 헬퍼
function parseSheetNumber(val: any): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/[₩$,\s]/g, '');
  return Number.parseFloat(cleaned) || 0;
}

/**
 * 배당내역 삭제 (Supabase + Google Sheet)
 */
export async function deleteDividend(input: DeleteDividendInput): Promise<SaveDividendResult> {
  console.log('===========================================');
  console.log('[deleteDividend] FUNCTION CALLED');
  console.log('[deleteDividend] Input:', JSON.stringify(input));
  console.log('===========================================');

  const session = await auth();

  if (!session?.user?.id) {
    console.log('[deleteDividend] No session user id');
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (!session.accessToken) {
    console.log('[deleteDividend] No access token');
    return { success: false, error: 'Google 인증이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 사용자의 spreadsheet_id 조회
    let { data: user } = await supabase
      .from('users')
      .select('id, spreadsheet_id')
      .eq('id', session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id, spreadsheet_id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user?.spreadsheet_id) {
      console.log('[deleteDividend] No spreadsheet_id');
      return { success: false, error: '연동된 스프레드시트가 없습니다.' };
    }

    console.log('[deleteDividend] User found, spreadsheet_id:', user.spreadsheet_id);

    const userId = user.id as string;

    // 1. Supabase에서 삭제
    const { error: dbError, count } = await supabase
      .from('dividends')
      .delete()
      .eq('user_id', userId)
      .eq('ticker', input.ticker)
      .eq('dividend_date', input.date)
      .eq('amount_krw', input.amountKRW)
      .eq('amount_usd', input.amountUSD);

    console.log('[deleteDividend] Supabase delete result - error:', dbError, 'count:', count);

    // 2. Google Sheet에서 해당 행 찾아서 삭제
    const sheetName = '7. 배당내역';
    console.log('[deleteDividend] Fetching sheet data...');
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      `'${sheetName}'!A:J`
    );

    console.log('[deleteDividend] Sheet rows count:', rows?.length || 0);

    if (rows && rows.length > 1) {
      let found = false;

      // 헤더 행 분석하여 컬럼 인덱스 찾기
      const headerRow = rows[0] || [];
      let dateCol = -1;
      let tickerCol = -1;
      let amountKRWCol = -1;
      let amountUSDCol = -1;

      for (let i = 0; i < headerRow.length; i++) {
        const header = String(headerRow[i] || '').toLowerCase();
        if (header.includes('날짜') || header.includes('date') || header.includes('일자')) {
          dateCol = i;
        } else if (header.includes('종목코드') || header.includes('ticker') || header.includes('코드')) {
          tickerCol = i;
        } else if (header.includes('원화') || header.includes('krw') || header.includes('배당금')) {
          if (amountKRWCol === -1) amountKRWCol = i;
        } else if (header.includes('달러') || header.includes('usd') || header.includes('$') || header.includes('외화')) {
          amountUSDCol = i;
        }
      }

      // 헤더를 찾지 못한 경우 기존 템플릿 시트 구조 기준 기본값 사용
      // 템플릿: A=빈칸, B=시리얼날짜, C=연도, D=월, E=일, F=종목코드, G=종목명, H=원화배당금, I=외화배당금
      if (dateCol === -1) dateCol = 1; // B열 (시리얼 날짜)
      if (tickerCol === -1) tickerCol = 5; // F열
      if (amountKRWCol === -1) amountKRWCol = 7; // H열
      if (amountUSDCol === -1) amountUSDCol = 8; // I열

      console.log('[deleteDividend] Column indices:', { dateCol, tickerCol, amountKRWCol, amountUSDCol });

      // 첫 몇 행의 raw 데이터 로깅
      console.log('[deleteDividend] First 3 rows raw data:');
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`[deleteDividend] Row ${i}:`, JSON.stringify(rows[i]));
      }

      // 매칭되는 행 찾기 (날짜 + 종목코드 + 금액)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        // 날짜 찾기 - 여러 컬럼 시도
        let rowDate: string | null = null;
        for (let col = 0; col < Math.min(row.length, 5); col++) {
          rowDate = parseSheetDate(row[col]);
          if (rowDate) break;
        }

        if (!rowDate) continue; // 유효한 날짜 없으면 skip

        const rowTicker = String(row[tickerCol] || '').trim();
        const rowAmountKRW = parseSheetNumber(row[amountKRWCol]);
        const rowAmountUSD = parseSheetNumber(row[amountUSDCol]);

        // 처음 몇 개 행만 상세 로깅
        if (i <= 5) {
          console.log(`[deleteDividend] Row ${i}: date=${rowDate}, ticker=${rowTicker}, krw=${rowAmountKRW}, usd=${rowAmountUSD}`);
          console.log(`[deleteDividend] Input: date=${input.date}, ticker=${input.ticker}, krw=${input.amountKRW}, usd=${input.amountUSD}`);
        }

        if (
          rowDate === input.date &&
          rowTicker === input.ticker &&
          Math.abs(rowAmountKRW - input.amountKRW) < 1 &&
          Math.abs(rowAmountUSD - input.amountUSD) < 0.01
        ) {
          console.log(`[deleteDividend] Match found at row ${i}, deleting...`);
          // 행 삭제 (i는 0-based index)
          await deleteSheetRow(
            session.accessToken,
            user.spreadsheet_id,
            sheetName,
            i
          );
          found = true;
          break;
        }
      }
      if (!found) {
        console.log('[deleteDividend] No matching row found in sheet');
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    console.log('[deleteDividend] Success');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteDividend] Error:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    return { success: false, error: `삭제 실패: ${errorMessage}` };
  }
}
