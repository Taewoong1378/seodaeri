import { auth, signOut } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { Card, CardContent } from '@repo/design-system/components/card';
import { ChevronRight, ExternalLink, LogOut, Shield, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BottomNav } from '../dashboard/components/BottomNav';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center">
        <span className="font-bold text-lg tracking-tight text-white">설정</span>
      </header>

      <main className="p-5 space-y-6">
        {/* Profile Section */}
        <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || '프로필'}
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-white/10"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <User size={32} className="text-slate-400" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-white">{session.user.name}</h2>
                <p className="text-sm text-slate-400">{session.user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-0">
            <Link
              href="/settings/sheet"
              className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <ExternalLink size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">시트 연동 관리</p>
                  <p className="text-xs text-slate-500">Google 스프레드시트 연결 설정</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-500" />
            </Link>
            <Link
              href="/privacy"
              className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-500/10 flex items-center justify-center">
                  <Shield size={20} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">개인정보처리방침</p>
                  <p className="text-xs text-slate-500">개인정보 수집 및 이용 안내</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-500" />
            </Link>
          </CardContent>
        </Card>

        {/* Logout */}
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <Button
            type="submit"
            variant="ghost"
            className="w-full h-14 rounded-[16px] bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 gap-2"
          >
            <LogOut size={20} />
            로그아웃
          </Button>
        </form>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-slate-600">서대리 v1.0.0</p>
          <p className="text-xs text-slate-700 mt-1">Made By Taewoong Kang</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
