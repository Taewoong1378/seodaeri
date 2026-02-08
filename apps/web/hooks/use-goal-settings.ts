'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import {
  getGoalSettings,
  saveGoal,
  type GoalSettings,
  type SaveGoalResult,
} from '../app/actions/goal';

export function useGoalSettings() {
  return useQuery<GoalSettings | null>({
    queryKey: queryKeys.goalSettings,
    queryFn: () => getGoalSettings(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useSaveGoal() {
  const queryClient = useQueryClient();

  return useMutation<SaveGoalResult, Error, { type: 'yearly' | 'monthly'; amount: number }>({
    mutationFn: ({ type, amount }) => saveGoal(type, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalSettings });
    },
  });
}

export type { GoalSettings, SaveGoalResult } from '../app/actions/goal';
