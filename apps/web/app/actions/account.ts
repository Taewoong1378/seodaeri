'use server';

import { auth, signOut } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

/**
 * 회원탈퇴 (soft delete)
 * - users 테이블의 deleted_at에 현재 시간 기록
 * - 실제 데이터는 삭제하지 않음
 * - 추후 복구 또는 일정 기간 후 완전 삭제 가능
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    // 사용자 조회
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

    const userId = user.id as string;

    // soft delete: deleted_at 설정
    const { error: updateError } = await supabase
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        spreadsheet_id: null, // 스프레드시트 연결 해제
      } as any)
      .eq('id', userId);

    if (updateError) {
      console.error('deleteAccount update error:', updateError);
      return { success: false, error: '회원탈퇴 처리 중 오류가 발생했습니다.' };
    }

    // 로그아웃 처리
    await signOut({ redirect: false });

    return { success: true };
  } catch (error: any) {
    console.error('deleteAccount error:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    return { success: false, error: `회원탈퇴 실패: ${errorMessage}` };
  }
}

/**
 * 회원 복구 (deleted_at이 설정된 계정 복구)
 * 관리자용 또는 일정 기간 내 복구 요청 시 사용
 */
export async function restoreAccount(userId: string): Promise<DeleteAccountResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        deleted_at: null,
      } as any)
      .eq('id', userId);

    if (updateError) {
      console.error('restoreAccount update error:', updateError);
      return { success: false, error: '계정 복구 중 오류가 발생했습니다.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('restoreAccount error:', error);
    const errorMessage = error?.message || '알 수 없는 오류';
    return { success: false, error: `계정 복구 실패: ${errorMessage}` };
  }
}
