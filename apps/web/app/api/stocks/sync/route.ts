import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@repo/auth/server';
import { 
  syncStocksFromKRX, 
  syncUSStocks,
  getLastSyncTime, 
  getUSStocksLastSyncTime,
  getStocksCountByMarket,
} from '../../../actions/stocks';

/**
 * 종목 데이터 동기화 API
 * 
 * GET /api/stocks/sync - 동기화 상태 조회
 * POST /api/stocks/sync - 동기화 실행 (인증 필요)
 *   - body: { market: 'kr' | 'us' | 'all' }
 */

// 동기화 상태 조회
export async function GET() {
  try {
    const [krSyncTime, usSyncTime, counts] = await Promise.all([
      getLastSyncTime(),
      getUSStocksLastSyncTime(),
      getStocksCountByMarket(),
    ]);

    return NextResponse.json({
      kr: {
        lastSync: krSyncTime.timestamp,
        count: counts.kr,
        status: counts.kr > 0 ? 'synced' : 'not_synced',
      },
      us: {
        lastSync: usSyncTime.timestamp,
        count: counts.us,
        status: counts.us > 0 ? 'synced' : 'not_synced',
      },
      total: counts.total,
    });
  } catch (error) {
    console.error('[stocks/sync] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

// 동기화 실행
export async function POST(request: NextRequest) {
  try {
    // 인증 확인 (관리자만 실행 가능)
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 이메일 체크 (환경변수로 관리)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    
    if (adminEmails.length > 0 && !adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { error: '관리자만 동기화를 실행할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 요청 body에서 market 파라미터 추출
    let market = 'kr';
    try {
      const body = await request.json();
      market = body.market || 'kr';
    } catch {
      // body 파싱 실패 시 기본값 사용
    }

    console.log(`[stocks/sync] Sync started by ${session.user.email}, market: ${market}`);
    
    let result;
    
    if (market === 'us') {
      result = await syncUSStocks();
    } else if (market === 'all') {
      // 한국 + 미국 모두 동기화
      const krResult = await syncStocksFromKRX();
      const usResult = await syncUSStocks();
      
      const totalCount = (krResult.count || 0) + (usResult.count || 0);
      const hasError = !krResult.success || !usResult.success;
      
      result = {
        success: !hasError || totalCount > 0,
        message: hasError 
          ? `일부 동기화 실패: 한국(${krResult.success ? krResult.count : '실패'}), 미국(${usResult.success ? usResult.count : '실패'})`
          : `총 ${totalCount}개 종목 동기화 완료 (한국: ${krResult.count}, 미국: ${usResult.count})`,
        count: totalCount,
        error: hasError ? `KR: ${krResult.error || 'OK'}, US: ${usResult.error || 'OK'}` : undefined,
      };
    } else {
      result = await syncStocksFromKRX();
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        count: result.count,
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: result.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[stocks/sync] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync stocks' },
      { status: 500 }
    );
  }
}
