'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import { appendSheetData } from '../../lib/google-sheets';

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

    return { success: true };
  } catch (error) {
    console.error('saveDividend error:', error);
    return { success: false, error: '저장 중 오류가 발생했습니다.' };
  }
}
