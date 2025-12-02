'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import { appendSheetData, extractAccountsFromDeposits, fetchSheetData } from '../../lib/google-sheets';

export interface DepositInput {
  date: string; // YYYY-MM-DD
  amount: number;
  memo: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  account: string; // 계좌 종류
}

export interface SaveDepositResult {
  success: boolean;
  error?: string;
}

/**
 * 입금내역을 Google Sheet에 저장
 * 시트 구조: "6. 입금내역" - 일자 | 연도 | 월 | 일 | 구분 | 계좌 | 금액 | 비고
 */
export async function saveDeposit(input: DepositInput): Promise<SaveDepositResult> {
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

    // 시트에 추가할 데이터
    // 구조: 일자 | 연도 | 월 | 일 | 계좌(증권사) | 구분 | 금액 | 비고
    const rowData = [
      input.date, // A: 일자
      year, // B: 연도
      `${month}월`, // C: 월
      `${day}일`, // D: 일
      input.account || '일반계좌1', // E: 계좌(증권사)
      input.type === 'DEPOSIT' ? '입금' : '출금', // F: 구분
      input.type === 'DEPOSIT' ? `₩${input.amount.toLocaleString()}` : `-₩${input.amount.toLocaleString()}`, // G: 금액
      input.memo || '', // H: 비고
    ];

    await appendSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'6. 입금내역'!A:H",
      [rowData]
    );

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    return { success: true };
  } catch (error) {
    console.error('saveDeposit error:', error);
    return { success: false, error: '저장 중 오류가 발생했습니다.' };
  }
}

/**
 * 자동 입금 설정 저장 (매월 반복)
 */
export interface AutoDepositSetting {
  amount: number;
  dayOfMonth: number; // 1-31
  memo: string;
  enabled: boolean;
}

export async function saveAutoDepositSetting(setting: AutoDepositSetting): Promise<SaveDepositResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // ID로 먼저 조회, 실패하면 이메일로 fallback
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single();

    if (!user && session.user.email) {
      const { data: userByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (userByEmail) {
        user = userByEmail;
      }
    }

    if (!user) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    // auto_deposit_settings JSONB 컬럼에 저장
    const { error } = await supabase
      .from('users')
      .update({
        auto_deposit_settings: setting,
      } as any)
      .eq('id', user.id);

    if (error) {
      console.error('saveAutoDepositSetting error:', error);
      return { success: false, error: '설정 저장에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('saveAutoDepositSetting error:', error);
    return { success: false, error: '설정 저장 중 오류가 발생했습니다.' };
  }
}

export async function getAutoDepositSetting(): Promise<AutoDepositSetting | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const supabase = createServiceClient();

  try {
    const { data: user } = await supabase
      .from('users')
      .select('auto_deposit_settings')
      .eq('id', session.user.id)
      .single() as any;

    return user?.auto_deposit_settings || null;
  } catch (error) {
    console.error('getAutoDepositSetting error:', error);
    return null;
  }
}

/**
 * 스프레드시트에서 계좌 목록 가져오기
 */
export async function getAccountList(): Promise<string[]> {
  const session = await auth();

  if (!session?.user?.id || !session.accessToken) {
    return getDefaultAccounts();
  }

  const supabase = createServiceClient();

  try {
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
      return getDefaultAccounts();
    }

    // 입금내역에서 계좌 목록 추출
    const depositRows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      "'6. 입금내역'!A:H"
    );

    if (depositRows) {
      const accounts = extractAccountsFromDeposits(depositRows);
      if (accounts.length > 0) {
        return accounts;
      }
    }

    return getDefaultAccounts();
  } catch (error) {
    console.error('getAccountList error:', error);
    return getDefaultAccounts();
  }
}

function getDefaultAccounts(): string[] {
  return [
    '일반계좌1',
    '일반계좌2',
    '개인연금1',
    '개인연금2',
    'IRP 1',
    'IRP 2',
    'ISA',
    '퇴직연금DC',
  ];
}
