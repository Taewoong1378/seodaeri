import { auth, signOut } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../actions/onboarding';
import { BottomNav } from '../dashboard/components/BottomNav';
import { OnboardingClient } from './OnboardingClient';

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // 데모 계정은 온보딩 스킵하고 바로 대시보드로 (Play Store 심사용)
  if (session.isDemo) {
    redirect('/dashboard');
  }

  // 이미 시트가 연동되어 있으면 대시보드로
  const { connected } = await checkSheetConnection();
  if (connected) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">Gulim</span>
        <div className="flex items-center gap-3">
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
              <LogOut size={16} />
            </Button>
          </form>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Welcome Message */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-foreground">
              환영합니다, {session.user.name?.split(' ')[0]}님!
            </h1>
            <p className="text-muted-foreground">
              투자 기록을 시작하려면 구글 스프레드시트를 연동해주세요.
            </p>
          </div>

          <OnboardingClient
            userName={session.user.name || undefined}
            accessToken={session.accessToken || undefined}
          />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
