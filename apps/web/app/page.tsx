import { Button } from '@repo/design-system/components/button'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Globe,
  LayoutDashboard,
  LineChart,
  Lock,
  PieChart,
  Smartphone,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col relative overflow-hidden bg-[#020617] text-slate-50 selection:bg-indigo-500/30">
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <span className="font-serif font-bold text-[#020617] text-xl">S</span>
          </div>
          <span className="font-medium text-lg tracking-tight text-white">서대리</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <Link href="#features" className="hover:text-white transition-colors">기능 소개</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">사용 방법</Link>
          <Link href="#faq" className="hover:text-white transition-colors">자주 묻는 질문</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            로그인
          </Link>
          <Button asChild className="bg-white text-[#020617] hover:bg-slate-200 font-medium px-5 rounded-full">
            <Link href="/login">시작하기</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 md:pt-32 md:pb-48 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            월급쟁이 투자자를 위한 기록 서비스
          </div>
          
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 text-white leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            입력은 1초,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">데이터는 평생.</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 break-keep">
            유튜브 '서대리TV'의 투자 템플릿을 모바일 앱으로.<br className="hidden md:block" />
            구글 스프레드시트와 연동되어 당신만의 평생 자산 데이터를 구축합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Button asChild size="lg" className="h-14 px-8 text-lg bg-white text-[#020617] hover:bg-slate-100 rounded-full transition-all duration-300">
              <Link href="/login">
                무료로 시작하기
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-sm">
              <Link href="https://www.youtube.com/@서대리TV" target="_blank">
                서대리TV 방문하기
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="relative z-10 py-24 bg-slate-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">이런 분들을 위해 만들었습니다</h2>
            <p className="text-slate-400">투자에 진심인 직장인들을 위한 맞춤형 서비스</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: LayoutDashboard,
                title: "서대리 시트 사용자",
                desc: "이미 서대리 투자 템플릿으로 기록 중인 분"
              },
              {
                icon: Users,
                title: "직장인 투자자",
                desc: "바쁜 일상 속에서도 투자 기록을 놓치고 싶지 않은 분"
              },
              {
                icon: Smartphone,
                title: "모바일 우선 사용자",
                desc: "PC보다 스마트폰이 편한 분"
              },
              {
                icon: TrendingUp,
                title: "배당 투자자",
                desc: "배당금 현황을 한눈에 보고 싶은 분"
              }
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed break-keep">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="relative z-10 py-32">
        <div className="max-w-7xl mx-auto px-6 space-y-32">
          
          {/* Feature 1: Sheet Sync */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl bg-[#0f172a] border border-white/10 p-8 shadow-2xl overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/5">
                    <div className="w-8 h-8 rounded bg-[#0F9D58] flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">내 투자 기록.xlsx</div>
                      <div className="text-xs text-slate-400">Google Sheets</div>
                    </div>
                    <div className="ml-auto text-xs text-[#0F9D58] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> 연동됨
                    </div>
                  </div>
                  <div className="h-px bg-white/10 my-4" />
                  <div className="space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-white/10" />
                    <div className="h-2 w-1/2 rounded-full bg-white/10" />
                    <div className="h-2 w-full rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                강력한 연동
              </div>
              <h3 className="text-3xl md:text-4xl font-semibold text-white mb-6">내 시트 그대로,<br />앱에서 편리하게</h3>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 break-keep">
                기존에 사용하던 서대리 투자 템플릿을 그대로 연결합니다. 새로운 사용자라면 템플릿을 자동으로 복사해서 시작할 수 있습니다.
              </p>
              <ul className="space-y-4">
                {[
                  "Google 계정으로 간편 로그인",
                  "기존 시트 자동 연동",
                  "새 시트 원클릭 생성"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 2: Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
                <PieChart className="w-4 h-4" />
                대시보드
              </div>
              <h3 className="text-3xl md:text-4xl font-semibold text-white mb-6">내 자산 현황을<br />한눈에 파악</h3>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 break-keep">
                총 자산부터 수익률, 배당금 현황까지. 흩어져 있는 투자 정보를 하나의 대시보드에서 직관적으로 확인하세요.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "총 자산", desc: "현재 보유 자산 총액" },
                  { label: "총 수익률", desc: "투자 성과 요약" },
                  { label: "배당금", desc: "월별/연도별 추이" },
                  { label: "포트폴리오", desc: "종목별 비중 시각화" }
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="font-medium text-white mb-1">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl bg-[#0f172a] border border-white/10 p-6 shadow-2xl">
                {/* Abstract Dashboard UI */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2 p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="h-3 w-20 bg-white/30 rounded mb-2" />
                    <div className="h-8 w-32 bg-white/50 rounded" />
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="h-3 w-12 bg-white/20 rounded mb-2" />
                    <div className="h-6 w-20 bg-emerald-500/20 rounded" />
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="h-3 w-12 bg-white/20 rounded mb-2" />
                    <div className="h-6 w-20 bg-blue-500/20 rounded" />
                  </div>
                </div>
                <div className="h-32 rounded-xl bg-white/5 border border-white/5 flex items-end justify-between p-4 gap-2">
                  {[40, 60, 45, 70, 50, 80, 65].map((h, i) => (
                    <div key={`${i}-${h}`} className="w-full bg-indigo-500/30 rounded-t-sm" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Dividend Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl bg-[#0f172a] border border-white/10 p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white font-medium">배당 성장</div>
                  <div className="text-xs text-slate-400">Last 12 Months</div>
                </div>
                <div className="relative h-48 w-full">
                  {/* Chart Lines */}
                  <svg className="absolute inset-0 h-full w-full overflow-visible">
                    <title>Chart Lines</title>
                    <path d="M0 150 C 50 140, 100 100, 150 80 S 250 40, 350 20" fill="none" stroke="#818cf8" strokeWidth="3" />
                    <path d="M0 150 L 350 150" fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeDasharray="4 4" />
                  </svg>
                  {/* Points */}
                  <div className="absolute top-[20px] right-0 w-3 h-3 rounded-full bg-indigo-400 ring-4 ring-indigo-500/20" />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
                <LineChart className="w-4 h-4" />
                배당 분석
              </div>
              <h3 className="text-3xl md:text-4xl font-semibold text-white mb-6">투자의 즐거움,<br />배당금 분석</h3>
              <p className="text-lg text-slate-400 leading-relaxed mb-8 break-keep">
                단순한 기록을 넘어 배당 투자의 성과를 다양한 관점에서 분석해드립니다.
              </p>
              <div className="space-y-4">
                {[
                  "연도별 배당금 비교",
                  "누적 배당금 추이",
                  "배당 수익률 vs S&P500 비교",
                  "12개월 롤링 배당금"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Characteristics Section */}
      <section className="relative z-10 py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-[#020617] border border-white/10">
              <Lock className="w-10 h-10 text-indigo-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-4">내 데이터는 내 것</h3>
              <p className="text-slate-400 leading-relaxed">
                모든 투자 데이터는 <span className="text-white font-medium">내 Google 계정의 스프레드시트</span>에 저장됩니다. 서비스가 종료되더라도 데이터는 영원히 내 것입니다.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#020617] border border-white/10">
              <CreditCard className="w-10 h-10 text-emerald-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-4">무료로 사용</h3>
              <p className="text-slate-400 leading-relaxed">
                주식 시세 조회에 비싼 API를 사용하지 않습니다. Google 스프레드시트의 <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-white">GOOGLEFINANCE</code> 함수를 활용해 실시간 시세를 무료로 제공합니다.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-[#020617] border border-white/10">
              <LayoutDashboard className="w-10 h-10 text-blue-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-4">서대리 시트와 완벽 호환</h3>
              <p className="text-slate-400 leading-relaxed">
                기존 서대리TV 투자 템플릿의 모든 수식과 구조를 그대로 활용합니다. 앱과 시트를 병행해서 사용해도 문제없습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative z-10 py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">사용 방법</h2>
            <p className="text-slate-400">3단계로 시작하는 스마트한 투자 기록</p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-[28px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-transparent hidden md:block" />
            
            <div className="space-y-12">
              {[
                {
                  step: "01",
                  title: "로그인",
                  desc: "Google 계정으로 안전하게 로그인합니다.",
                  icon: Users
                },
                {
                  step: "02",
                  title: "시트 연동",
                  desc: "기존 서대리 시트가 있다면 선택하고, 처음이라면 '새 시트 만들기'를 클릭하세요.",
                  icon: LayoutDashboard
                },
                {
                  step: "03",
                  title: "투자 기록 시작",
                  desc: "대시보드에서 내 투자 현황을 확인하고, 매매 기록을 추가합니다.",
                  icon: TrendingUp
                }
              ].map((item) => (
                <div key={item.step} className="relative flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#020617] border-2 border-indigo-500 flex items-center justify-center z-10">
                    <span className="text-indigo-400 font-bold">{item.step}</span>
                  </div>
                  <div className="flex-1 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors w-full">
                    <div className="flex items-center gap-3 mb-3">
                      <item.icon className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                    </div>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Future Plans */}
      <section className="relative z-10 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold text-white mb-6">앞으로 이런 기능이 추가됩니다</h2>
              <p className="text-slate-400 mb-8">서대리는 계속해서 발전하고 있습니다.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "AI 자동 입력 (OCR)",
                  "거래 내역 직접 관리",
                  "배당금 입금 알림",
                  "익명 커뮤니티"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full max-w-sm p-8 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-white/10 text-center">
              <h3 className="text-xl font-semibold text-white mb-4">함께 만들어가요</h3>
              <p className="text-slate-400 text-sm mb-6">
                필요한 기능이 있다면 언제든 알려주세요.<br />
                여러분의 의견으로 서비스가 성장합니다.
              </p>
              <Button asChild className="w-full bg-white text-[#020617] hover:bg-slate-200">
                <Link href="mailto:twkang43@gmail.com">의견 보내기</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
              <span className="font-serif font-bold text-white text-sm">S</span>
            </div>
            <span className="text-sm font-medium text-slate-400">Seodaeri Inc.</span>
          </div>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">이용약관</Link>
            <Link href="mailto:twkang43@gmail.com" className="hover:text-slate-300 transition-colors">문의하기</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="https://www.youtube.com/@서대리TV" target="_blank" className="text-slate-500 hover:text-[#FF0000] transition-colors">
              <span className="sr-only">YouTube</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.418-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Globe className="w-4 h-4" />
              <span>Seoul, KR</span>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-8 text-center">
          <p className="text-xs text-slate-600">Made with ❤️ for 월급쟁이 투자자들</p>
        </div>
      </footer>
    </main>
  )
}
