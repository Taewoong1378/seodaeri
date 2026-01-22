import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../actions/onboarding';
import { BottomNav } from '../dashboard/components/BottomNav';
import { TransactionsWrapper } from './components/TransactionsWrapper';

export default async function TransactionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // 데모 계정은 시트 연동 체크 스킵 (Play Store 심사용)
  let sheetUrl: string | null = null;
  if (!session.isDemo) {
    const { connected, sheetId } = await checkSheetConnection();
    if (!connected) {
      redirect('/onboarding');
    }
    sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0` : null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">내역</span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5"
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
              className="rounded-full border border-border"
            />
          )}
        </div>
      </header>

      <main className="p-5 space-y-4">
        <TransactionsWrapper />
      </main>

      <BottomNav />
    </div>
  );
}
