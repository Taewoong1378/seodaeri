'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { revalidatePath } from 'next/cache';
import { copyMasterTemplate, findSeodaeriSheet } from '../../lib/google-sheets';

export interface OnboardingResult {
  success: boolean;
  sheetId?: string;
  sheetName?: string;
  isNewSheet?: boolean;
  error?: string;
}

/**
 * 사용자의 시트 연동 상태 확인
 */
export async function checkSheetConnection(): Promise<{ connected: boolean; sheetId?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { connected: false };
  }

  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('id', session.user.id)
    .single();

  return {
    connected: !!user?.spreadsheet_id,
    sheetId: user?.spreadsheet_id || undefined,
  };
}

/**
 * 기존 서대리 시트 검색 및 연동
 */
export async function searchAndConnectSheet(): Promise<OnboardingResult> {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  try {
    // 1. Google Drive에서 서대리 시트 검색
    const existingSheet = await findSeodaeriSheet(session.accessToken);

    if (!existingSheet) {
      return { success: false, error: '서대리 시트를 찾을 수 없습니다.' };
    }

    // 2. DB에 spreadsheet_id 저장
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from('users')
      .update({
        spreadsheet_id: existingSheet.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to update spreadsheet_id:', updateError);
      return { success: false, error: '시트 연동에 실패했습니다.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/onboarding');

    return {
      success: true,
      sheetId: existingSheet.id,
      sheetName: existingSheet.name,
      isNewSheet: false,
    };
  } catch (error) {
    console.error('searchAndConnectSheet error:', error);
    return { success: false, error: '시트 검색 중 오류가 발생했습니다.' };
  }
}

/**
 * 마스터 템플릿을 복사하여 새 시트 생성 및 연동
 */
export async function createNewSheet(): Promise<OnboardingResult> {
  const session = await auth();
  if (!session?.user?.id || !session.accessToken) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  try {
    // 1. 마스터 템플릿 복사
    const newSheet = await copyMasterTemplate(session.accessToken, session.user.name || undefined);

    // 2. DB에 spreadsheet_id 저장
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from('users')
      .update({
        spreadsheet_id: newSheet.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to update spreadsheet_id:', updateError);
      return { success: false, error: '시트 연동에 실패했습니다.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/onboarding');

    return {
      success: true,
      sheetId: newSheet.id,
      sheetName: newSheet.name,
      isNewSheet: true,
    };
  } catch (error: any) {
    console.error('createNewSheet error:', error);

    if (error.message?.includes('마스터 템플릿 ID')) {
      return { success: false, error: error.message };
    }

    return { success: false, error: '새 시트 생성 중 오류가 발생했습니다.' };
  }
}

/**
 * 수동으로 시트 ID 입력하여 연동
 */
export async function connectSheetById(sheetId: string): Promise<OnboardingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  if (!sheetId || sheetId.trim().length === 0) {
    return { success: false, error: '시트 ID를 입력해주세요.' };
  }

  try {
    const supabase = createServiceClient();
    const { error: updateError } = await supabase
      .from('users')
      .update({
        spreadsheet_id: sheetId.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Failed to update spreadsheet_id:', updateError);
      return { success: false, error: '시트 연동에 실패했습니다.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/onboarding');

    return {
      success: true,
      sheetId: sheetId.trim(),
      isNewSheet: false,
    };
  } catch (error) {
    console.error('connectSheetById error:', error);
    return { success: false, error: '시트 연동 중 오류가 발생했습니다.' };
  }
}
