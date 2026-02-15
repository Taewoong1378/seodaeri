import { fetchSheetData, parseDividendData } from '../../../lib/google-sheets';
import { auth } from '@repo/auth/server';
import { createServiceClient } from '@repo/database/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    const debugInfo: Record<string, any> = {
      hasSession: !!session,
      userId: session?.user?.id || null,
      userEmail: session?.user?.email || null,
      hasAccessToken: !!session?.accessToken,
    };

    if (session?.user?.id) {
      const supabase = createServiceClient();

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email || '')
        .single();

      if (session?.accessToken && user?.spreadsheet_id) {
        try {
          // 배당내역 가져오기
          const dividendRows = await fetchSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'7. 배당내역'!A:K"
          );

          const dividends = parseDividendData(dividendRows || []);

          // 월별 배당금 집계 (시트에서 계산된 totalKRW 사용)
          const monthlyMap = new Map<string, number>();

          for (const d of dividends) {
            const date = new Date(d.date);
            if (Number.isNaN(date.getTime())) continue;

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${String(month).padStart(2, '0')}`;

            // 시트에서 계산된 totalKRW 사용 (실시간 환율 적용됨)
            const existing = monthlyMap.get(key) || 0;
            monthlyMap.set(key, existing + d.totalKRW);
          }

          // 월별 배당금 (정렬)
          const monthlyDividends: Record<string, number> = {};
          const sortedEntries = Array.from(monthlyMap.entries()).sort();
          for (const [key, value] of sortedEntries) {
            monthlyDividends[key] = Math.round(value);
          }

          // 12개월 롤링 평균 계산 (실제 데이터가 있는 마지막 월까지만)
          const allMonths = Array.from(monthlyMap.keys()).sort();

          // 첫 번째 월부터 마지막 배당 월까지 모든 월 생성
          const firstMonth = allMonths[0];
          const lastMonth = allMonths[allMonths.length - 1];
          const [firstYear, firstMon] = (firstMonth ?? '2023-01').split('-').map(Number);
          const [lastYear, lastMon] = (lastMonth ?? '2025-12').split('-').map(Number);

          const fullMonths: string[] = [];
          let y = firstYear ?? 2023;
          let m = firstMon ?? 1;
          while (y < (lastYear || 2025) || (y === (lastYear || 2025) && m <= (lastMon || 12))) {
            fullMonths.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
          }

          // 최근 3개월 롤링 평균 상세
          const rollingAvgDetails: Record<string, any> = {};

          for (let i = Math.max(0, fullMonths.length - 3); i < fullMonths.length; i++) {
            const currentKey = fullMonths[i];
            if (!currentKey) continue;

            let sum = 0;
            let count = 0;
            const includedMonths: Record<string, number> = {};

            for (let j = Math.max(0, i - 11); j <= i; j++) {
              const monthKey = fullMonths[j];
              if (monthKey) {
                const monthValue = monthlyMap.get(monthKey) || 0;
                sum += monthValue;
                count++;
                includedMonths[monthKey] = Math.round(monthValue);
              }
            }

            const average = count > 0 ? Math.round(sum / Math.min(count, 12)) : 0;

            rollingAvgDetails[currentKey] = {
              sum: Math.round(sum),
              count,
              average,
              includedMonths,
            };
          }

          debugInfo.dividendCount = dividends.length;
          debugInfo.monthlyDividends = monthlyDividends;
          debugInfo.rollingAvgDetails = rollingAvgDetails;

        } catch (sheetError: any) {
          debugInfo.sheetError = sheetError?.message || 'Unknown sheet error';
        }
      }
    }

    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
