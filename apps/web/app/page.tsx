import { Button } from '@repo/design-system/components/button'
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileSpreadsheet,
  LayoutDashboard,
  LineChart,
  Lock,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { LandingDividendChart, LandingProfitLossChart } from './components/LandingPageCharts'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-900 selection:bg-slate-100">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-xl tracking-tight">Gulim</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <Link href="#features" className="hover:text-slate-900 transition-colors">기능</Link>
            <Link href="#philosophy" className="hover:text-slate-900 transition-colors">철학</Link>
            <Link href="#pricing" className="hover:text-slate-900 transition-colors">가격</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              로그인
            </Link>
            <Button asChild className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-6">
              <Link href="/login">시작하기</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-8 text-slate-900 tracking-tight">
            투자의 기록,<br />
            <span className="text-slate-400 font-medium">평생의 자산이 되다.</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-normal">
            서대리TV의 투자 철학을 담은 모바일 앱, <strong>굴림(Gulim)</strong>.<br className="hidden md:block" />
            당신의 소중한 투자 데이터를 안전하게 보관하고 분석합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
              <Link href="/login">
                무료로 시작하기
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Link href="https://www.youtube.com/@서대리TV" target="_blank" className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors px-6 py-4">
              <span className="border-b border-transparent group-hover:border-slate-900 transition-all">서대리TV 방문하기</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Philosophy / Value Prop */}
      <section id="philosophy" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <Lock className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-serif font-medium">안전한 데이터 관리</h3>
              <p className="text-slate-500 leading-relaxed">
                모든 데이터는 안전한 클라우드 데이터베이스에 암호화되어 저장됩니다. 언제든지 엑셀로 내보내어 데이터를 소유할 수 있습니다.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <LayoutDashboard className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-serif font-medium">직관적인 시각화</h3>
              <p className="text-slate-500 leading-relaxed">
                복잡한 숫자들이 아름다운 차트와 대시보드로 변환됩니다. 모바일에서도 내 자산을 한눈에 파악하세요.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-xl font-serif font-medium">배당 성장 투자</h3>
              <p className="text-slate-500 leading-relaxed">
                단순한 수익률을 넘어, 월별 배당금 흐름과 연도별 성장 추이를 분석합니다. 현금 흐름을 만드는 즐거움을 느껴보세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <section id="features" className="py-32 space-y-32">
        
        {/* Feature 1: Sync */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 bg-slate-100 rounded-3xl p-6 md:p-12 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-50" />
              <div className="relative z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-sm mx-auto transform transition-transform duration-500 group-hover:scale-105">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center text-green-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">내 투자 기록.xlsx</div>
                    <div className="text-xs text-slate-400">Google Sheets</div>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-slate-100 rounded w-3/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                  <div className="h-2 bg-slate-100 rounded w-full" />
                  <div className="h-2 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-serif text-4xl font-medium mb-6 leading-tight">
                익숙한 시트 그대로,<br />
                경험은 새롭게.
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                기존에 사용하던 서대리 투자 템플릿을 그대로 가져오세요. 
                복잡한 데이터 이관 없이, 구글 시트 연동으로 즉시 시작할 수 있습니다.
                물론, 앱에서 직접 입력하고 관리하는 것도 가능합니다.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-slate-900" />
                  <span>기존 서대리 템플릿 100% 호환</span>
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-slate-900" />
                  <span>간편한 데이터 가져오기</span>
                </li>
                <li className="flex items-center gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-slate-900" />
                  <span>언제든지 엑셀로 데이터 백업 가능</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 2: Dashboard */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="font-serif text-4xl font-medium mb-6 leading-tight">
                흩어진 자산을<br />
                한눈에 파악하세요.
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                총 자산, 수익률, 그리고 예상 배당금까지.
                투자 현황을 직관적인 대시보드로 확인하세요.
                복잡한 HTS/MTS보다 더 깔끔하고, 꼭 필요한 정보만 담았습니다.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-serif font-medium text-slate-900 mb-1">100%</div>
                  <div className="text-sm text-slate-500">무료 실시간 시세</div>
                </div>
                <div>
                  <div className="text-3xl font-serif font-medium text-slate-900 mb-1">0원</div>
                  <div className="text-sm text-slate-500">유지 비용</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-3xl p-6 md:p-12 relative overflow-hidden shadow-2xl">
              <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-4 md:p-6">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <div className="text-white/60 text-sm mb-1">총 자산</div>
                    <div className="text-3xl font-medium text-white">₩ 124,500,000</div>
                  </div>
                  <div className="text-emerald-400 font-medium">+12.5%</div>
                </div>
                <LandingProfitLossChart />
              </div>
            </div>
          </div>
        </div>

        {/* Feature 3: Dividend Analysis */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 bg-slate-50 rounded-3xl p-6 md:p-12 border border-slate-100">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-8 overflow-hidden">
                <LandingDividendChart />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-serif text-4xl font-medium mb-6 leading-tight">
                배당금이 늘어나는<br />
                즐거움을 시각적으로.
              </h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                매달 들어오는 배당금, 얼마나 늘어나고 있을까요?
                월별 배당금, 연도별 성장률, 그리고 12개월 이동평균까지.
                배당 투자자에게 꼭 필요한 분석 지표를 제공합니다.
              </p>
              <Button variant="outline" className="rounded-full border-slate-200 hover:bg-slate-50 text-slate-900">
                <LineChart className="w-4 h-4 mr-2" />
                분석 기능 더보기
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-medium mb-8 text-slate-900">
            지금 바로 시작하세요.
          </h2>
          <p className="text-xl text-slate-500 mb-12 max-w-xl mx-auto">
            복잡한 설정 없이, 구글 계정만 있으면 됩니다.<br />
            당신의 투자를 더 체계적으로 기록해보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-14 px-10 text-lg rounded-full bg-slate-900 text-white hover:bg-slate-800">
              <Link href="/login">
                무료로 시작하기
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-slate-400">
            * 신용카드 정보는 필요하지 않습니다.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-16 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div>
              <span className="font-serif font-bold text-xl tracking-tight text-slate-900">Gulim</span>
              <p className="mt-4 text-sm text-slate-500 max-w-xs">
                월급쟁이 투자자들을 위한<br />
                가장 신뢰할 수 있는 투자 기록 서비스
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <h4 className="font-medium text-slate-900 mb-4">서비스</h4>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li><Link href="/login" className="hover:text-slate-900">로그인</Link></li>
                  <li><Link href="#features" className="hover:text-slate-900">기능 소개</Link></li>
                  <li><Link href="#pricing" className="hover:text-slate-900">가격 정책</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-4">지원</h4>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li><Link href="mailto:twkang43@gmail.com" className="hover:text-slate-900">문의하기</Link></li>
                  <li><Link href="/terms" className="hover:text-slate-900">이용약관</Link></li>
                  <li><Link href="/privacy" className="hover:text-slate-900">개인정보처리방침</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-4">소셜</h4>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li><Link href="https://www.youtube.com/@서대리TV" target="_blank" className="hover:text-slate-900">YouTube</Link></li>
                  <li><Link href="#" className="hover:text-slate-900">Instagram</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
            <p>© 2024 Gulim. All rights reserved.</p>
            <p>Made in Seoul, Korea</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
