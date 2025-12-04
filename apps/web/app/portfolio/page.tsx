import { BenefitBanner } from '@/app/portfolio/components/BenefitBanner';
import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { ExternalLink, PieChart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData } from '../actions/dashboard';
import { checkSheetConnection } from '../actions/onboarding';
import { BottomNav } from '../dashboard/components/BottomNav';
import { SyncButton } from '../dashboard/components/SyncButton';
import { PortfolioClient } from './components/PortfolioClient';

function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (compact && amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export default async function PortfolioPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { connected, sheetId } = await checkSheetConnection();
  if (!connected) {
    redirect('/onboarding');
  }

  const data = await getDashboardData();
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;

  const portfolio = data?.portfolio || [];
  const totalAsset = data?.totalAsset || 0;

  // 시트의 투자비중 사용 (없으면 계산)
  const portfolioWithWeight = portfolio.map((item) => ({
    ...item,
    weight: item.weight > 0 ? item.weight : (totalAsset > 0 ? (item.totalValue / totalAsset) * 100 : 0),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">포트폴리오</span>
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

      <main className="p-5 space-y-6">
        {/* Summary */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">총 평가금액</h2>
            <span className="text-xs text-muted-foreground">{portfolio.length}개 종목</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground tracking-tight">
              {formatCurrency(totalAsset, true)}
            </span>
            <span className="text-sm text-muted-foreground font-medium">원</span>
          </div>
          {data && (
            <div className="flex items-center gap-4 text-sm bg-card p-4 rounded-[20px] border border-border shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">투자원금</span>
                <span className="text-foreground font-medium">{formatCurrency(data.totalInvested, true)}원</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">수익금</span>
                <span
                  className={`font-medium ${data.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                >
                  {formatCurrency(data.totalProfit, true)}원
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Account Opening Banner */}
        <BenefitBanner />

        {/* Portfolio Content (List or Chart) */}
        {portfolio.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <PieChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">보유 종목이 없습니다</h3>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              시트의 '3. 종목현황' 탭에 데이터를 입력하거나
              <br />
              매매 인증을 통해 종목을 추가해보세요.
            </p>
          </div>
        ) : (
          <PortfolioClient portfolio={portfolioWithWeight} />
        )}
      </main>


      <BottomNav />
    </div>
  );
}
