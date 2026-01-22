import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../actions/onboarding';
import { BottomNav } from './components/BottomNav';
import { DashboardContent } from './components/DashboardContent';
import { SyncButton } from './components/SyncButton';

export default async function DashboardPage() {
  const session = await auth();

  // 로그인 체크
  if (!session?.user) {
    redirect('/login');
  }

  // 사용자 상태 체크 - 유저가 등록되지 않았으면 온보딩으로
  const { connected, sheetId, userExists, isStandalone } = await checkSheetConnection();
  if (!userExists) {
    redirect('/onboarding');
  }

  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">굴림</span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5 rounded-full"
              >
                <ExternalLink size={14} />
                시트
              </Button>
            </Link>
          )}
          <SyncButton />
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || '프로필'}
              width={32}
              height={32}
              className="rounded-full border border-border ring-2 ring-background"
            />
          )}
        </div>
      </header>

      <main className="p-5">
        <DashboardContent />
      </main>

      <BottomNav />
    </div>
  );
}
