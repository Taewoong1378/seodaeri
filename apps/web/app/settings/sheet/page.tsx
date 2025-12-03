import { auth } from '@repo/auth/server';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../../actions/onboarding';
import { BottomNav } from '../../dashboard/components/BottomNav';
import { SheetManageClient } from './SheetManageClient';

export default async function SheetManagePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { connected, sheetId } = await checkSheetConnection();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center gap-3">
        <Link
          href="/settings"
          className="p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-400" />
        </Link>
        <span className="font-bold text-lg tracking-tight text-white">시트 연동 관리</span>
      </header>

      <main className="p-5">
        <SheetManageClient
          connected={connected}
          currentSheetId={sheetId}
          accessToken={session.accessToken || undefined}
        />
      </main>

      <BottomNav />
    </div>
  );
}
