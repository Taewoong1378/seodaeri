import { auth } from '@repo/auth/server';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../actions/onboarding';
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
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <span className="font-serif font-bold text-[#020617] text-xl">S</span>
          </div>
          <span className="font-medium text-lg tracking-tight text-white">서대리</span>
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

          <OnboardingClient userName={session.user.name || undefined} />
        </div>
      </main>
    </div>
  );
}
