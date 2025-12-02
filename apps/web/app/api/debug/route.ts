import { fetchSheetData } from '@/lib/google-sheets';
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
      envVars: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    };

    if (session?.user?.id) {
      const supabase = createServiceClient();

      // Check if user exists in DB (이메일로 조회)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email || '')
        .single();

      debugInfo.dbUser = user;
      debugInfo.dbError = userError?.message || null;

      // Try to list all users (for debugging)
      const { data: allUsers, error: listError } = await supabase
        .from('users')
        .select('id, email, spreadsheet_id')
        .limit(5);

      debugInfo.allUsers = allUsers;
      debugInfo.listError = listError?.message || null;

      // "5. 계좌내역(누적)" 시트의 E:Z열 데이터 가져오기 (수익률 비교용)
      if (session?.accessToken && user?.spreadsheet_id) {
        try {
          // E:Z열 데이터 (17행부터 - 헤더 포함)
          const sheetData = await fetchSheetData(
            session.accessToken,
            user.spreadsheet_id,
            "'5. 계좌내역(누적)'!E17:Z50"
          );
          debugInfo.accountHistoryData = sheetData;
          console.log('[DEBUG] 5. 계좌내역(누적) E:Z 데이터:', JSON.stringify(sheetData, null, 2));
        } catch (sheetError: any) {
          debugInfo.sheetError = sheetError?.message || 'Unknown sheet error';
        }
      }
    }

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
