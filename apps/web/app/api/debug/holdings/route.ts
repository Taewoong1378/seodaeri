import { auth } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'
import { type NextRequest, NextResponse } from 'next/server'

const ADMIN_EMAILS = ['xodndxnxn@gmail.com', 'gulim.app00@gmail.com']

/**
 * 사용자 Holdings 진단 엔드포인트
 * GET /api/debug/holdings?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // holdings 조회
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .order('ticker', { ascending: true })

    // deposits 조회
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('deposit_date', { ascending: false })
      .limit(20)

    // account_balances 조회
    const { data: accountBalances, error: balancesError } = await (supabase as any)
      .from('account_balances')
      .select('*')
      .eq('user_id', userId)
      .order('year_month', { ascending: false })
      .limit(10)

    // portfolio_cache 조회
    const { data: cache, error: cacheError } = await supabase
      .from('portfolio_cache')
      .select('*')
      .eq('user_id', userId)
      .order('ticker', { ascending: true })

    // 투자원금 계산 시뮬레이션
    let totalInvestedCalc = 0
    const holdingDetails = (holdings || []).map((h: any) => {
      if (h.ticker === 'CASH') {
        const krwAmount = h.quantity || 0
        const usdAmount = h.avg_price || 0
        const estimated = krwAmount + usdAmount * 1450 // 대략적 환율
        totalInvestedCalc += estimated
        return {
          ...h,
          _calcNote: `CASH: KRW=${krwAmount} + USD=${usdAmount} × ~1450 = ${Math.round(estimated)}`,
        }
      }
      const rate = h.currency === 'USD' ? 1450 : 1
      const invested = (h.avg_price || 0) * (h.quantity || 0) * rate
      totalInvestedCalc += invested
      return {
        ...h,
        _calcNote: `${h.avg_price} × ${h.quantity} × ${rate} = ${Math.round(invested)}`,
      }
    })

    return NextResponse.json({
      userId,
      holdingsCount: holdings?.length || 0,
      holdings: holdingDetails,
      accountBalances,
      deposits,
      cache,
      _totalInvestedEstimate: Math.round(totalInvestedCalc),
      _errors: {
        holdings: holdingsError?.message,
        accountBalances: balancesError?.message,
        deposits: depositsError?.message,
        cache: cacheError?.message,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
