'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type GoalSettings,
  type SaveGoalResult,
  getGoalSettings,
  saveGoal,
} from '../app/actions/goal'
import { queryKeys } from '../lib/query-client'

export function useGoalSettings() {
  return useQuery<GoalSettings | null>({
    queryKey: queryKeys.goalSettings,
    queryFn: () => getGoalSettings(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useSaveGoal() {
  const queryClient = useQueryClient()

  return useMutation<
    SaveGoalResult,
    Error,
    { type: 'finalAsset' | 'annualDeposit'; amount: number }
  >({
    mutationFn: ({ type, amount }) => saveGoal(type, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goalSettings })
    },
  })
}

export type { GoalSettings, SaveGoalResult } from '../app/actions/goal'
