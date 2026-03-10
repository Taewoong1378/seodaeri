import { createServiceClient } from '@repo/database/server'

const CUTOFF_DATE = '2026-03-06T00:00:00.000Z'

export async function getValidUsers() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .gte('created_at', CUTOFF_DATE)
  if (error) throw error
  return data ?? []
}

export async function getHoldings(userIds: string[]) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .in('user_id', userIds)
  if (error) throw error
  return data ?? []
}

export async function getTransactions(userIds: string[]) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .in('user_id', userIds)
    .order('trade_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPortfolioSnapshots(userIds: string[]) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .in('user_id', userIds)
    .order('snapshot_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getStocks() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .eq('is_active', true)
  if (error) throw error
  return data ?? []
}

// Aggregate fetch for the dashboard
export async function getDashboardData() {
  const users = await getValidUsers()
  const userIds = users.map(u => u.id)

  if (userIds.length === 0) {
    return { users: [], holdings: [], transactions: [], snapshots: [], stocks: [] }
  }

  const [holdings, transactions, snapshots, stocks] = await Promise.all([
    getHoldings(userIds),
    getTransactions(userIds),
    getPortfolioSnapshots(userIds),
    getStocks(),
  ])

  return { users, holdings, transactions, snapshots, stocks }
}
