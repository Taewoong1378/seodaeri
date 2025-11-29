import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/card';
import { LogOut, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getDashboardData, syncPortfolio } from '../actions/dashboard';
import { checkSheetConnection } from '../actions/onboarding';
import { BottomNav } from './components/BottomNav';
import { DividendChart } from './components/DividendChart';
import { HeroCard } from './components/HeroCard';
import { OCRModal } from './components/OCRModal';

export default async function DashboardPage() {
  const session = await auth();

  // 로그인 체크
  if (!session?.user) {
    redirect('/login');
  }

  // 시트 연동 체크 - 연동 안 되어 있으면 온보딩으로
  const { connected } = await checkSheetConnection();
  if (!connected) {
    redirect('/onboarding');
  }

  const data = await getDashboardData();

  // Fallback data if DB is empty
  const displayData = data || {
    totalAsset: 0,
    totalYield: 0,
    monthlyDividends: [],
    portfolio: []
  };

  const mockDashboard = {
    monthlyDividends: [
      { month: '1월', amount: 150000 },
      { month: '2월', amount: 120000 },
      { month: '3월', amount: 280000 },
      { month: '4월', amount: 190000 },
      { month: '5월', amount: 210000 },
      { month: '6월', amount: 350000 },
    ]
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">서대리</span>
        <div className="flex items-center gap-3">
          <form action={async () => {
            'use server';
            await syncPortfolio();
          }}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
              <RefreshCw size={16} />
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

      <main className="p-5 space-y-8">
        {/* Hero Section */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-400">총 자산</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              displayData.totalYield >= 0
                ? 'text-emerald-400 bg-emerald-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}>
              {displayData.totalYield >= 0 ? '+' : ''}{displayData.totalYield.toFixed(1)}%
            </span>
          </div>
          <HeroCard 
            totalAsset={displayData.totalAsset} 
            totalYield={displayData.totalYield} 
          />
        </section>
        
        {/* Quick Stats */}
        <section className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          <Card className="bg-white/5 border-white/5 shadow-none rounded-2xl backdrop-blur-sm">
            <CardContent className="p-5 flex flex-col items-start justify-center space-y-1">
              <span className="text-xs font-medium text-slate-400">이번 달 배당금</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white">45,000</span>
                <span className="text-xs text-slate-500">원</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/5 shadow-none rounded-2xl backdrop-blur-sm">
            <CardContent className="p-5 flex flex-col items-start justify-center space-y-1">
              <span className="text-xs font-medium text-slate-400">연간 예상 배당</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-white">540,000</span>
                <span className="text-xs text-slate-500">원</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Chart Section */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-white">월별 배당금</h3>
            <button type="button" className="text-xs font-medium text-slate-400 hover:text-white transition-colors">전체보기</button>
          </div>
          <Card className="border-white/5 bg-white/5 shadow-none rounded-[24px] overflow-hidden">
            <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
              <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                2024년 상반기
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <DividendChart data={mockDashboard.monthlyDividends} />
            </CardContent>
          </Card>
        </section>
      </main>

      <OCRModal />
      <BottomNav />
    </div>
  );
}
