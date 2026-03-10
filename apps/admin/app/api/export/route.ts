import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceClient } from '@repo/database/server'
import { arrayToCsv, isETF, getMarket } from '@/lib/utils'

const ALLOWED_EMAILS = ['xodndxnxn@gmail.com']
const CUTOFF_DATE = '2026-03-06T00:00:00.000Z'

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const email = cookieStore.get('admin_email')?.value
  return !!email && ALLOWED_EMAILS.includes(email)
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type')
  if (!type || !['users', 'holdings', 'popular-stocks'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get valid users
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .gte('created_at', CUTOFF_DATE)
  const validUsers = users ?? []
  const userIds = validUsers.map(u => u.id)

  if (userIds.length === 0) {
    return new NextResponse('No data', { status: 200 })
  }

  let csv = ''
  let filename = ''

  if (type === 'users') {
    // Get holdings count per user
    const { data: holdings } = await supabase
      .from('holdings')
      .select('user_id, ticker')
      .in('user_id', userIds)
    const holdingsCountMap = new Map<string, number>()
    for (const h of (holdings ?? [])) {
      holdingsCountMap.set(h.user_id, (holdingsCountMap.get(h.user_id) ?? 0) + 1)
    }

    const headers = ['이메일', '이름', '가입일', '유형', '보유종목수']
    const rows: string[][] = validUsers.map(u => [
      u.email ?? '',
      u.name ?? '',
      u.created_at.split('T')[0] ?? '',
      u.spreadsheet_id ? 'Sheet' : 'Standalone',
      String(holdingsCountMap.get(u.id) ?? 0),
    ])
    csv = arrayToCsv(headers, rows)
    filename = 'users'
  } else if (type === 'holdings') {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .in('user_id', userIds)

    const userEmailMap = new Map(validUsers.map(u => [u.id, u.email ?? '']))

    const headers = ['사용자이메일', '티커', '종목명', '수량', '평균단가', '통화']
    const rows: string[][] = (holdings ?? []).map(h => [
      userEmailMap.get(h.user_id) ?? '',
      h.ticker,
      h.name ?? '',
      String(h.quantity ?? 0),
      String(h.avg_price ?? 0),
      h.currency,
    ])
    csv = arrayToCsv(headers, rows)
    filename = 'holdings'
  } else if (type === 'popular-stocks') {
    const { data: holdings } = await supabase
      .from('holdings')
      .select('*')
      .in('user_id', userIds)

    const tickerMap = new Map<string, { name: string; ticker: string; users: Set<string>; currency: string }>()
    for (const h of (holdings ?? [])) {
      const existing = tickerMap.get(h.ticker)
      if (existing) {
        existing.users.add(h.user_id)
      } else {
        tickerMap.set(h.ticker, {
          name: h.name ?? h.ticker,
          ticker: h.ticker,
          users: new Set([h.user_id]),
          currency: h.currency,
        })
      }
    }

    const sorted = Array.from(tickerMap.values())
      .sort((a, b) => b.users.size - a.users.size)

    const headers = ['티커', '종목명', '보유자수', '시장']
    const rows = sorted.map(s => [
      s.ticker,
      s.name,
      String(s.users.size),
      getMarket(s.currency),
    ])
    csv = arrayToCsv(headers, rows)
    filename = 'popular-stocks'
  }

  // Add BOM for Korean Excel compatibility
  const bom = '\uFEFF'
  return new NextResponse(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
