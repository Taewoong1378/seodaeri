'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import { appendSheetData, deleteSheetRow, extractAccountsFromDeposits, fetchSheetData } from '../../lib/google-sheets';

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
    // 구조: 일자 | 연도 | 월 | 일 | 구분 | 계좌(증권사) | 금액 | 비고
    const rowData = [
      input.date, // A: 일자
      year, // B: 연도
      `${month}월`, // C: 월
      `${day}일`, // D: 일
      input.type === 'DEPOSIT' ? '입금' : '출금', // E: 구분
      input.account || '일반계좌1', // F: 계좌(증권사)
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

export interface DeleteDepositInput {
  date: string;      // YYYY-MM-DD
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
}

/**
 * 입출금내역 삭제 (Supabase + Google Sheet)
 */
export async function deleteDeposit(input: DeleteDepositInput): Promise<SaveDepositResult> {
  console.log('[deleteDeposit] Called with input:', JSON.stringify(input));

  const session = await auth();

  if (!session?.user?.id) {
    console.log('[deleteDeposit] No session user id');
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (!session.accessToken) {
    console.log('[deleteDeposit] No access token');
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
      console.log('[deleteDeposit] No spreadsheet_id');
      return { success: false, error: '연동된 스프레드시트가 없습니다.' };
    }

    console.log('[deleteDeposit] User found, spreadsheet_id:', user.spreadsheet_id);

    const userId = user.id as string;

    // 1. Supabase에서 삭제
    const { error: dbError, count } = await supabase
      .from('deposits')
      .delete()
      .eq('user_id', userId)
      .eq('type', input.type)
      .eq('amount', input.amount)
      .eq('deposit_date', input.date);

    console.log('[deleteDeposit] Supabase delete result - error:', dbError, 'count:', count);

    // 2. Google Sheet에서 해당 행 찾아서 삭제
    const sheetName = '6. 입금내역';
    console.log('[deleteDeposit] Fetching sheet data...');
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      `'${sheetName}'!A:H`
    );

    console.log('[deleteDeposit] Sheet rows count:', rows?.length || 0);

    if (rows) {
      let found = false;

      // 첫 몇 행의 raw 데이터 로깅
      console.log('[deleteDeposit] First 3 rows raw data:');
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`[deleteDeposit] Row ${i}:`, JSON.stringify(rows[i]));
      }

      // 매칭되는 행 찾기 (날짜 + 금액 + 타입)
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
        const rowType = String(row[offset + 4] || '').trim(); // 구분
        const rowAmountStr = String(row[offset + 6] || '0'); // 금액
        const rowAmount = Math.abs(parseFloat(rowAmountStr.replace(/[₩,\s-]/g, '')) || 0);

        // 날짜 형식 맞추기
        const normalizedRowDate = rowDate.replace(/\//g, '-');

        // 타입 매칭
        const isDeposit = rowType.includes('입금') || !rowAmountStr.includes('-');
        const matchType = (input.type === 'DEPOSIT' && isDeposit) ||
                         (input.type === 'WITHDRAW' && !isDeposit);

        // 처음 몇 개 행만 상세 로깅
        if (i <= 5) {
          console.log(`[deleteDeposit] Row ${i} (offset=${offset}): date=${normalizedRowDate}, type=${rowType}, amount=${rowAmount}, isDeposit=${isDeposit}`);
          console.log(`[deleteDeposit] Input: date=${input.date}, type=${input.type}, amount=${input.amount}`);
        }

        if (
          normalizedRowDate === input.date &&
          matchType &&
          Math.abs(rowAmount - input.amount) < 1
        ) {
          console.log(`[deleteDeposit] Match found at row ${i}, deleting...`);
          // 행 삭제
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
        console.log('[deleteDeposit] No matching row found in sheet');
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    console.log('[deleteDeposit] Success');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteDeposit] Error:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    return { success: false, error: `삭제 실패: ${errorMessage}` };
  }
}
