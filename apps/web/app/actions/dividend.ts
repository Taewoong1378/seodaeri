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

    if (rows) {
      let found = false;

      // 첫 몇 행의 raw 데이터 로깅
      console.log('[deleteDividend] First 3 rows raw data:');
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`[deleteDividend] Row ${i}:`, JSON.stringify(rows[i]));
      }

      // 매칭되는 행 찾기 (날짜 + 종목코드 + 금액)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 5) continue;

        // 시트 구조 확인: 앞에 빈 컬럼이 있을 수 있음
        // 실제 데이터 위치 찾기: 날짜 형식(YYYY-MM-DD 또는 YYYY/MM/DD)을 찾아서 offset 결정
        let offset = 0;
        for (let j = 0; j < Math.min(3, row.length); j++) {
          const val = String(row[j] || '');
          if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(val)) {
            offset = j;
            break;
          }
        }

        const rowDate = String(row[offset] || '').trim(); // 일자
        const rowTicker = String(row[offset + 4] || '').trim(); // 종목코드
        const rowAmountKRWStr = String(row[offset + 6] || '0');
        const rowAmountUSDStr = String(row[offset + 7] || '0');
        const rowAmountKRW = parseFloat(rowAmountKRWStr.replace(/[₩,\s]/g, '')) || 0;
        const rowAmountUSD = parseFloat(rowAmountUSDStr.replace(/[$,\s]/g, '')) || 0;

        // 날짜 형식 맞추기 (YYYY-MM-DD 또는 YYYY/MM/DD)
        const normalizedRowDate = rowDate.replace(/\//g, '-');

        // 처음 몇 개 행만 상세 로깅
        if (i <= 5) {
          console.log(`[deleteDividend] Row ${i} (offset=${offset}): date=${normalizedRowDate}, ticker=${rowTicker}, krw=${rowAmountKRW}, usd=${rowAmountUSD}`);
          console.log(`[deleteDividend] Input: date=${input.date}, ticker=${input.ticker}, krw=${input.amountKRW}, usd=${input.amountUSD}`);
        }

        if (
          normalizedRowDate === input.date &&
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
