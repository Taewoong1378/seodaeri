import { Button } from '@repo/design-system/components/button'
import { ArrowRight, Globe, Lock, PieChart, Smartphone } from 'lucide-react'
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
          <Link href="#" className="hover:text-white transition-colors">투자 철학</Link>
          <Link href="#" className="hover:text-white transition-colors">주요 기능</Link>
          <Link href="#" className="hover:text-white transition-colors">보안</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            로그인
          </Link>
          <Button asChild className="bg-white text-[#020617] hover:bg-slate-200 font-medium px-5 rounded-full">
            <Link href="/mobile">앱 다운로드</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 text-center max-w-5xl mx-auto mt-16 md:mt-24 mb-20">
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-8 text-white leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
          입력은 1초,<br />
          <span className="text-slate-400">데이터는 평생.</span>
        </h1>
        
        <p className="text-xl text-slate-400 mb-12 max-w-2xl leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 break-keep">
          AI OCR로 매매 인증샷만 찍으면 끝. <br className="hidden md:block" />
          구글 스프레드시트와 연동되어 당신만의 평생 자산 데이터를 구축합니다.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <Button asChild size="lg" className="h-14 px-8 text-lg bg-white text-[#020617] hover:bg-slate-100 rounded-full transition-all duration-300">
            <Link href="/login">
              지금 시작하기
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>

        {/* Abstract Dashboard Preview */}
        <div className="mt-20 relative w-full max-w-4xl aspect-[16/9] rounded-t-xl bg-slate-900/50 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#020617]/80 z-10" />
           {/* Mock UI Elements - Realistic Dashboard */}
           <div className="p-8 grid grid-cols-12 gap-6 opacity-90 text-left">
              {/* Sidebar Mock */}
              <div className="hidden md:block col-span-3 space-y-4 border-r border-white/5 pr-6">
                <div className="h-8 w-24 rounded bg-white/10 mb-8" />
                <div className="space-y-2">
                  <div className="h-10 w-full rounded bg-indigo-500/20 border border-indigo-500/30" />
                  <div className="h-10 w-full rounded bg-white/5" />
                  <div className="h-10 w-full rounded bg-white/5" />
                </div>
              </div>
              
              {/* Main Content Mock */}
              <div className="col-span-12 md:col-span-9 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div className="h-8 w-32 rounded bg-white/10" />
                  <div className="h-8 w-8 rounded-full bg-white/10" />
                </div>
                
                {/* Hero Card Mock */}
                <div className="h-40 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex flex-col justify-between shadow-lg">
                  <div className="h-4 w-20 rounded bg-white/30" />
                  <div className="h-10 w-48 rounded bg-white/50" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-white/20" />
                    <div className="h-6 w-16 rounded-full bg-white/20" />
                  </div>
                </div>

                {/* Grid Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="h-8 w-8 rounded bg-emerald-500/20 mb-2" />
                    <div className="h-4 w-20 rounded bg-white/10 mb-1" />
                    <div className="h-6 w-24 rounded bg-white/20" />
                  </div>
                  <div className="h-32 rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="h-8 w-8 rounded bg-blue-500/20 mb-2" />
                    <div className="h-4 w-20 rounded bg-white/10 mb-1" />
                    <div className="h-6 w-24 rounded bg-white/20" />
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="relative z-10 border-t border-white/5 bg-[#020617]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Smartphone,
                title: "AI 자동 입력",
                desc: "매매 내역을 캡처만 하세요. GPT-4o가 종목, 가격, 수량을 자동으로 분석하여 입력합니다."
              },
              {
                icon: PieChart,
                title: "하이브리드 데이터",
                desc: "빠른 앱 구동을 위한 DB와 복잡한 수식 계산을 위한 구글 시트를 동시에 활용합니다."
              },
              {
                icon: Lock,
                title: "데이터 소유권",
                desc: "모든 데이터는 사용자의 구글 드라이브에 저장되어, 서비스가 종료되어도 데이터는 평생 남습니다."
              }
            ].map((feature) => (
              <div key={feature.title} className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-slate-200" />
                </div>
                <h3 className="text-xl font-medium text-white">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed break-keep">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
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
            <Link href="mailto:xodndxnxnx@gmail.com" className="hover:text-slate-300 transition-colors">문의하기</Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe className="w-4 h-4" />
            <span>Seoul, KR</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
