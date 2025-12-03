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

  // 이미 시트가 연동되어 있으면 대시보드로
  const { connected } = await checkSheetConnection();
  if (connected) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">서대리</span>
        <div className="flex items-center gap-3">
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
              <LogOut size={16} />
            </Button>
          </form>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Welcome Message */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-white">
              환영합니다, {session.user.name?.split(' ')[0]}님!
            </h1>
            <p className="text-slate-400">
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
