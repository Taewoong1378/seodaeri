'use server';

import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';

// V2 저장 구조: 연도별/월별 목표 기록
export interface GoalSettingsData {
  yearlyGoals: Record<string, number>;  // { "2025": 100000000, "2026": 120000000 }
  monthlyGoals: Record<string, number>; // { "2025-01": 5000000, "2025-02": 6000000 }
}

// 클라이언트에서 사용하는 현재 목표 + 전체 기록
export interface GoalSettings {
  yearlyGoal: number | null;
  monthlyGoal: number | null;
  yearlyGoals: Record<string, number>;
  monthlyGoals: Record<string, number>;
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

// V1 → V2 마이그레이션: 기존 { yearlyGoal, monthlyGoal } → { yearlyGoals, monthlyGoals }
function migrateGoalSettings(raw: any): GoalSettingsData {
  if (raw?.yearlyGoals || raw?.monthlyGoals) {
    // 이미 V2 형식
    return {
      yearlyGoals: raw.yearlyGoals || {},
      monthlyGoals: raw.monthlyGoals || {},
    };
  }

  // V1 형식: { yearlyGoal, monthlyGoal }
  const now = new Date();
  const year = String(now.getFullYear());
  const yearMonth = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const yearlyGoals: Record<string, number> = {};
  const monthlyGoals: Record<string, number> = {};

  if (raw?.yearlyGoal && raw.yearlyGoal > 0) {
    yearlyGoals[year] = raw.yearlyGoal;
  }
  if (raw?.monthlyGoal && raw.monthlyGoal > 0) {
    monthlyGoals[yearMonth] = raw.monthlyGoal;
  }

  return { yearlyGoals, monthlyGoals };
}

export async function saveGoal(
  type: 'yearly' | 'monthly',
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

    if (type === 'yearly') {
      const year = String(now.getFullYear());
      if (amount > 0) {
        existing.yearlyGoals[year] = amount;
      } else {
        delete existing.yearlyGoals[year];
      }
    } else {
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      if (amount > 0) {
        existing.monthlyGoals[yearMonth] = amount;
      } else {
        delete existing.monthlyGoals[yearMonth];
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
    const currentYearMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const yearlyGoal = data.yearlyGoals[currentYear] ?? null;
    const monthlyGoal = data.monthlyGoals[currentYearMonth] ?? null;

    if (!yearlyGoal && !monthlyGoal && Object.keys(data.yearlyGoals).length === 0 && Object.keys(data.monthlyGoals).length === 0) {
      return null;
    }

    return {
      yearlyGoal,
      monthlyGoal,
      yearlyGoals: data.yearlyGoals,
      monthlyGoals: data.monthlyGoals,
    };
  } catch (error) {
    console.error('getGoalSettings error:', error);
    return null;
  }
}
