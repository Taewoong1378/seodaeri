import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../actions/onboarding';
import { getTransactions } from '../actions/transactions';
import { BottomNav } from '../dashboard/components/BottomNav';
import { OCRModal } from '../dashboard/components/OCRModal';
import { TransactionsClient } from './components/TransactionsClient';

export default async function TransactionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { connected, sheetId } = await checkSheetConnection();
  if (!connected) {
    redirect('/onboarding');
  }

  const { transactions, error } = await getTransactions();
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0` : null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">내역</span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-slate-400 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <ExternalLink size={14} />
                시트 열기
              </Button>
            </Link>
          )}
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || '프로필'}
              width={32}
              height={32}
              className="rounded-full border border-white/10"
            />
          )}
        </div>
      </header>

      <main className="p-5 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <TransactionsClient transactions={transactions || []} />
      </main>

      <OCRModal />
      <BottomNav />
    </div>
  );
}
