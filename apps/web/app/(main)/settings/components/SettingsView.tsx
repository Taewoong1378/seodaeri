'use client'

import { Card, CardContent } from '@repo/design-system/components/card'
import { ChevronRight, ExternalLink, MessageSquarePlus, Shield, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { BottomNav } from '../../dashboard/components/BottomNav'
import { useMainContext } from '../../providers'
import { DeleteAccountButton } from '../DeleteAccountButton'
import { LogoutButton } from '../LogoutButton'
import { StockSyncButton } from '../StockSyncButton'

export function SettingsView() {
  const { user, isDemo, isAdmin } = useMainContext()

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center">
        <span className="font-bold text-lg tracking-tight text-foreground">설정</span>
      </header>

      <main className="p-5 space-y-6">
        {/* Profile Section */}
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || '프로필'}
                  width={64}
                  height={64}
                  className="rounded-full border-2 border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <User size={32} className="text-muted-foreground" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{user.name}</h2>
                  {isDemo && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-500 rounded-full">
                      데모
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Menu */}
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-0">
            {!isDemo && (
              <Link
                href="/settings/sheet"
                className="flex items-center justify-between p-4 border-b border-border hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <ExternalLink size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">시트 연동 관리</p>
                    <p className="text-xs text-muted-foreground">Google 스프레드시트 연결 설정</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </Link>
            )}
            <Link
              href="/privacy"
              className="flex items-center justify-between p-4 border-b border-border hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Shield size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">개인정보처리방침</p>
                  <p className="text-xs text-muted-foreground">개인정보 수집 및 이용 안내</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </Link>
            <a
              href="https://forms.gle/nVBcG4Ue3bnuVVpV8"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <MessageSquarePlus size={20} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">문의 및 제안</p>
                  <p className="text-xs text-muted-foreground">기능 요청, 버그 제보, 의견 보내기</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </a>
          </CardContent>
        </Card>

        {/* Admin Section */}
        {isAdmin && (
          <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-3">관리자 도구</p>
              <StockSyncButton />
            </CardContent>
          </Card>
        )}

        {/* Logout */}
        <LogoutButton />

        {/* Delete Account */}
        <div className="pt-2">
          <DeleteAccountButton />
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">굴림(Gulim) v1.0.0</p>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
