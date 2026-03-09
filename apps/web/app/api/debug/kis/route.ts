import { getKISToken, KIS_BASE_URL } from '../../../../lib/kis-token';
import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAILS = ['taewoong.jang@gmail.com'];

/**
 * KIS API 진단 엔드포인트
 * GET /api/debug/kis?ticker=QLD
 *
 * 3개 거래소(AMS, NYS, NAS) 모두 시도하고 각각의 raw 응답을 반환
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticker = req.nextUrl.searchParams.get('ticker') || 'QLD';
    const userId = req.nextUrl.searchParams.get('userId');

    const appKey = process.env.KIS_APP_KEY;
    const appSecret = process.env.KIS_APP_SECRET;

    if (!appKey || !appSecret) {
      return NextResponse.json({ error: 'KIS credentials not configured' }, { status: 500 });
    }

    const token = await getKISToken();
    if (!token) {
      return NextResponse.json({ error: 'Failed to get KIS token' }, { status: 500 });
    }

    // 3개 거래소 모두 시도
    const exchanges = ['AMS', 'NYS', 'NAS'];
    const results: Record<string, any> = {};

    for (const excd of exchanges) {
      try {
        const url = `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=${excd}&SYMB=${ticker}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            authorization: `Bearer ${token}`,
            appkey: appKey,
            appsecret: appSecret,
            tr_id: 'HHDFS00000300',
            custtype: 'P',
          },
        });

        const data = await response.json();
        results[excd] = {
          status: response.status,
          rt_cd: data.rt_cd,
          msg1: data.msg1,
          last: data.output?.last,
          diff: data.output?.diff,
          rate: data.output?.rate,
          tvol: data.output?.tvol,
          rawOutput: data.output,
        };
      } catch (error: any) {
        results[excd] = { error: error.message };
      }
    }

    // portfolio_cache 조회
    let cacheInfo = null;
    if (userId) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('portfolio_cache')
        .select('*')
        .eq('user_id', userId)
        .eq('ticker', ticker);
      cacheInfo = data;

      // 글로벌 캐시도 조회
      const { data: globalData } = await supabase
        .from('portfolio_cache')
        .select('user_id, ticker, current_price, currency, updated_at')
        .eq('ticker', ticker)
        .gt('current_price', 0)
        .order('updated_at', { ascending: false })
        .limit(5);

      return NextResponse.json({
        ticker,
        tokenOk: true,
        exchanges: results,
        userCache: cacheInfo,
        globalCache: globalData,
      });
    }

    return NextResponse.json({
      ticker,
      tokenOk: true,
      exchanges: results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
