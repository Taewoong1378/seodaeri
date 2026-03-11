'use client'

import { Button } from '@repo/design-system/components/button'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { BottomNav } from '../../dashboard/components/BottomNav'
import { SyncButton } from '../../dashboard/components/SyncButton'
import { useMainContext } from '../../providers'
import { PortfolioContent } from './PortfolioContent'
import { PortfolioSkeleton } from './PortfolioSkeleton'

export function PortfolioView() {
  const { user, sheetUrl, isStandalone } = useMainContext()

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
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
          {user.image && (
            <Image
              src={user.image}
              alt={user.name || '프로필'}
              width={32}
              height={32}
              className="rounded-full border border-border ring-2 ring-background"
            />
          )}
        </div>
      </header>
      <main className="p-5 space-y-6">
        <Suspense fallback={<PortfolioSkeleton />}>
          <PortfolioContent sheetUrl={sheetUrl} isStandalone={isStandalone} />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
