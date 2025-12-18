'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import { appendSheetData, deleteSheetRow, extractAccountsFromDeposits, fetchSheetData, insertRowInDateOrder } from '../../lib/google-sheets';

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

    // 날짜 순서에 맞는 위치에 삽입
    await insertRowInDateOrder(
      session.accessToken,
      user.spreadsheet_id,
      '6. 입금내역',
      "'6. 입금내역'!A:H",
      0, // A열(0)에 날짜가 있음
      input.date,
      rowData,
      1 // 헤더 1행
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

export interface UpdateDepositInput {
  // 원래 값 (매칭용)
  originalDate: string;
  originalType: 'DEPOSIT' | 'WITHDRAW';
  originalAmount: number;
  // 새 값
  newDate: string;
  newType: 'DEPOSIT' | 'WITHDRAW';
  newAmount: number;
  newAccount: string;
  newMemo: string;
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
  const cleaned = String(val).replace(/[₩$,\s-]/g, '');
  return Number.parseFloat(cleaned) || 0;
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

    if (rows && rows.length > 1) {
      let found = false;

      // 헤더 행 분석하여 컬럼 인덱스 찾기
      const headerRow = rows[0] || [];
      let dateCol = -1;
      let typeCol = -1;
      let amountCol = -1;

      for (let i = 0; i < headerRow.length; i++) {
        const header = String(headerRow[i] || '').toLowerCase();
        if (header.includes('날짜') || header.includes('date') || header.includes('일자')) {
          dateCol = i;
        } else if (header.includes('구분') || header.includes('type') || header.includes('유형')) {
          typeCol = i;
        } else if (header.includes('금액') || header.includes('amount') || header.includes('원')) {
          if (amountCol === -1) amountCol = i;
        }
      }

      // 헤더를 찾지 못한 경우 기존 템플릿 시트 구조 기준 기본값 사용
      // 템플릿: A=빈칸, B=시리얼날짜, C=연도, D=월, E=일, F=증권사, G=계좌, H=금액
      if (dateCol === -1) dateCol = 1; // B열 (시리얼 날짜)
      if (typeCol === -1) typeCol = -1; // 템플릿에 타입 컬럼 없음 (금액 부호로 판단)
      if (amountCol === -1) amountCol = 7; // H열

      console.log('[deleteDeposit] Column indices:', { dateCol, typeCol, amountCol });

      // 첫 몇 행의 raw 데이터 로깅
      console.log('[deleteDeposit] First 3 rows raw data:');
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        console.log(`[deleteDeposit] Row ${i}:`, JSON.stringify(rows[i]));
      }

      // 매칭되는 행 찾기 (날짜 + 금액 + 타입)
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

        const rowType = typeCol >= 0 ? String(row[typeCol] || '').trim() : '';
        const rowAmountStr = String(row[amountCol] || '0');
        const rowAmountRaw = parseSheetNumber(row[amountCol]);
        // 실제 금액 (부호 제거)
        const rowAmount = Math.abs(rowAmountRaw);

        // 타입 매칭: 타입 컬럼이 있으면 텍스트로, 없으면 금액 부호로 판단
        let isDeposit: boolean;
        if (typeCol >= 0 && rowType) {
          isDeposit = rowType.includes('입금') || !rowType.includes('출금');
        } else {
          // 금액이 음수이거나 "-" 포함하면 출금
          isDeposit = !rowAmountStr.includes('-') && rowAmountRaw >= 0;
        }
        const matchType = (input.type === 'DEPOSIT' && isDeposit) ||
                         (input.type === 'WITHDRAW' && !isDeposit);

        // 처음 몇 개 행만 상세 로깅
        if (i <= 5) {
          console.log(`[deleteDeposit] Row ${i}: date=${rowDate}, type=${rowType}, amount=${rowAmount}, isDeposit=${isDeposit}`);
          console.log(`[deleteDeposit] Input: date=${input.date}, type=${input.type}, amount=${input.amount}`);
        }

        if (
          rowDate === input.date &&
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

/**
 * 입출금내역 수정 (Supabase + Google Sheet)
 */
export async function updateDeposit(input: UpdateDepositInput): Promise<SaveDepositResult> {
  console.log('[updateDeposit] Called with input:', JSON.stringify(input));

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
      return { success: false, error: '연동된 스프레드시트가 없습니다.' };
    }

    const userId = user.id as string;

    // 1. Google Sheet에서 해당 행 찾아서 수정
    const sheetName = '6. 입금내역';
    const rows = await fetchSheetData(
      session.accessToken,
      user.spreadsheet_id,
      `'${sheetName}'!A:H`
    );

    if (rows && rows.length > 1) {
      // 컬럼 인덱스 (기본값)
      let dateCol = 1; // B열
      let amountCol = 7; // H열

      // 매칭되는 행 찾기
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        // 날짜 찾기
        let rowDate: string | null = null;
        for (let col = 0; col < Math.min(row.length, 5); col++) {
          rowDate = parseSheetDate(row[col]);
          if (rowDate) break;
        }

        if (!rowDate) continue;

        const rowAmountStr = String(row[amountCol] || '0');
        const rowAmountRaw = parseSheetNumber(row[amountCol]);
        const rowAmount = Math.abs(rowAmountRaw);

        // 타입 매칭
        const isDeposit = !rowAmountStr.includes('-') && rowAmountRaw >= 0;
        const matchType = (input.originalType === 'DEPOSIT' && isDeposit) ||
                         (input.originalType === 'WITHDRAW' && !isDeposit);

        if (
          rowDate === input.originalDate &&
          matchType &&
          Math.abs(rowAmount - input.originalAmount) < 1
        ) {
          console.log(`[updateDeposit] Match found at row ${i}, updating...`);

          // 새 날짜 파싱
          const dateParts = input.newDate.split('-');
          const year = dateParts[0] || '';
          const month = dateParts[1] || '';
          const day = dateParts[2] || '';

          // 시트에 업데이트할 데이터
          const newRowData = [
            input.newDate,
            year,
            `${month}월`,
            `${day}일`,
            input.newType === 'DEPOSIT' ? '입금' : '출금',
            input.newAccount || '일반계좌1',
            input.newType === 'DEPOSIT' ? `₩${input.newAmount.toLocaleString()}` : `-₩${input.newAmount.toLocaleString()}`,
            input.newMemo || '',
          ];

          // Google Sheets API로 행 업데이트
          const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${user.spreadsheet_id}/values/'${sheetName}'!A${i + 1}:H${i + 1}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: [newRowData] }),
            }
          );

          if (!response.ok) {
            throw new Error(`Sheet update failed: ${response.status}`);
          }

          break;
        }
      }
    }

    // 2. Supabase 업데이트
    // 기존 레코드 삭제 후 새로 생성 (unique constraint 때문)
    await supabase
      .from('deposits')
      .delete()
      .eq('user_id', userId)
      .eq('type', input.originalType)
      .eq('amount', input.originalAmount)
      .eq('deposit_date', input.originalDate);

    await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        type: input.newType,
        amount: input.newAmount,
        currency: 'KRW',
        deposit_date: input.newDate,
        memo: input.newMemo,
        sheet_synced: true,
      });

    revalidatePath('/dashboard');
    revalidatePath('/transactions');

    console.log('[updateDeposit] Success');
    return { success: true };
  } catch (error: any) {
    console.error('[updateDeposit] Error:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    return { success: false, error: `수정 실패: ${errorMessage}` };
  }
}
