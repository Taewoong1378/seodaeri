import { EXCLUDED_EMAILS } from '@/lib/constants'
import { createServiceClient } from '@repo/database/server'

export async function getValidUsers() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .not('email', 'in', `(${EXCLUDED_EMAILS.join(',')})`)
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
  // stocks 테이블은 수만 행 가능 — code만 가져오고 페이지네이션
  const allStocks: { code: string }[] = []
  const pageSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('stocks')
      .select('code')
      .eq('is_active', true)
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    if (data && data.length > 0) {
      allStocks.push(...data)
      offset += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  return allStocks
}

export async function getDividends(userIds: string[]) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('dividends')
    .select('*')
    .in('user_id', userIds)
    .order('dividend_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getDeposits(userIds: string[]) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .in('user_id', userIds)
    .order('deposit_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

// Aggregate fetch for the dashboard
export async function getDashboardData() {
  const users = await getValidUsers()
  const userIds = users.map(u => u.id)

  if (userIds.length === 0) {
    return { users: [], holdings: [], transactions: [], snapshots: [], stocks: [], dividends: [], deposits: [] }
  }

  const [holdings, transactions, snapshots, stocks, dividends, deposits] = await Promise.all([
    getHoldings(userIds),
    getTransactions(userIds),
    getPortfolioSnapshots(userIds),
    getStocks(),
    getDividends(userIds),
    getDeposits(userIds),
  ])

  return { users, holdings, transactions, snapshots, stocks, dividends, deposits }
}
