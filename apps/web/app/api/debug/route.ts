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

      // Check if user exists in DB
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
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
    }

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
