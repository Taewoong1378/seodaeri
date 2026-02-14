'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';

// V3 저장 구조: 최종 총자산 목표 / 연간 입금액 목표
export interface GoalSettingsData {
  finalAssetGoals: Record<string, number>;  // { "2025": 100000000, "2026": 120000000 }
  annualDepositGoals: Record<string, number>; // { "2025": 5000000, "2026": 6000000 }
}

// 클라이언트에서 사용하는 현재 목표 + 전체 기록
export interface GoalSettings {
  finalAssetGoal: number | null;
  annualDepositGoal: number | null;
  finalAssetGoals: Record<string, number>;
  annualDepositGoals: Record<string, number>;
}

export interface SaveGoalResult {
  success: boolean;
  error?: string;
}

async function findUser(supabase: any, sessionUserId: string, sessionEmail?: string | null) {
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', sessionUserId)
    .single() as any;

  if (!user && sessionEmail) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', sessionEmail)
      .single() as any;
    if (userByEmail) user = userByEmail;
  }

  return user;
}

// V1 → V3 마이그레이션: 기존 { yearlyGoal, monthlyGoal } → { finalAssetGoals, annualDepositGoals }
function migrateGoalSettings(raw: any): GoalSettingsData {
  // 이미 V3 형식
  if (raw?.finalAssetGoals || raw?.annualDepositGoals) {
    return {
      finalAssetGoals: raw.finalAssetGoals || {},
      annualDepositGoals: raw.annualDepositGoals || {},
    };
  }

  // V2 형식: { yearlyGoals, monthlyGoals } → V3
  if (raw?.yearlyGoals || raw?.monthlyGoals) {
    // monthlyGoals (YYYY-MM keyed) → annualDepositGoals (YYYY keyed): 각 연도의 마지막 값 사용
    const annualDepositGoals: Record<string, number> = {};
    if (raw.monthlyGoals) {
      for (const [yearMonth, value] of Object.entries(raw.monthlyGoals)) {
        const year = yearMonth.split('-')[0];
        if (year) annualDepositGoals[year] = value as number;
      }
    }
    return {
      finalAssetGoals: raw.yearlyGoals || {},
      annualDepositGoals,
    };
  }

  // V1 형식: { yearlyGoal, monthlyGoal }
  const now = new Date();
  const year = String(now.getFullYear());

  const finalAssetGoals: Record<string, number> = {};
  const annualDepositGoals: Record<string, number> = {};

  if (raw?.yearlyGoal && raw.yearlyGoal > 0) {
    finalAssetGoals[year] = raw.yearlyGoal;
  }
  if (raw?.monthlyGoal && raw.monthlyGoal > 0) {
    annualDepositGoals[year] = raw.monthlyGoal;
  }

  return { finalAssetGoals, annualDepositGoals };
}

export async function saveGoal(
  type: 'finalAsset' | 'annualDeposit',
  amount: number
): Promise<SaveGoalResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const supabase = createServiceClient();

  try {
    const user = await findUser(supabase, session.user.id, session.user.email);
    if (!user) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const existing = migrateGoalSettings(user.goal_settings);
    const now = new Date();
    const year = String(now.getFullYear());

    if (type === 'finalAsset') {
      if (amount > 0) {
        existing.finalAssetGoals[year] = amount;
      } else {
        delete existing.finalAssetGoals[year];
      }
    } else {
      if (amount > 0) {
        existing.annualDepositGoals[year] = amount;
      } else {
        delete existing.annualDepositGoals[year];
      }
    }

    const { error } = await supabase
      .from('users')
      .update({ goal_settings: existing } as any)
      .eq('id', user.id);

    if (error) {
      console.error('saveGoal error:', error);
      return { success: false, error: '설정 저장에 실패했습니다.' };
    }

    return { success: true };
  } catch (error) {
    console.error('saveGoal error:', error);
    return { success: false, error: '설정 저장 중 오류가 발생했습니다.' };
  }
}

export async function getGoalSettings(): Promise<GoalSettings | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const supabase = createServiceClient();

  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single() as any;

    if (error || !user) {
      if (session.user.email) {
        const { data: userByEmail } = await supabase
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single() as any;
        if (userByEmail) user = userByEmail;
      }
    }

    if (!user) return null;

    const goalSettings = user.goal_settings;
    if (!goalSettings || typeof goalSettings !== 'object') {
      return null;
    }

    const data = migrateGoalSettings(goalSettings);

    const now = new Date();
    const currentYear = String(now.getFullYear());

    const finalAssetGoal = data.finalAssetGoals[currentYear] ?? null;
    const annualDepositGoal = data.annualDepositGoals[currentYear] ?? null;

    if (!finalAssetGoal && !annualDepositGoal && Object.keys(data.finalAssetGoals).length === 0 && Object.keys(data.annualDepositGoals).length === 0) {
      return null;
    }

    return {
      finalAssetGoal,
      annualDepositGoal,
      finalAssetGoals: data.finalAssetGoals,
      annualDepositGoals: data.annualDepositGoals,
    };
  } catch (error) {
    console.error('getGoalSettings error:', error);
    return null;
  }
}
