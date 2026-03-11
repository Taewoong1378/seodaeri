'use client'

import { Button } from '@repo/design-system/components/button'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { useMainContext } from '../../providers'
import { BottomNav } from './BottomNav'
import { DashboardContent } from './DashboardContent'
import { DashboardSkeleton } from './DashboardSkeleton'
import { SyncButton } from './SyncButton'

export function DashboardView() {
  const { user, sheetUrl } = useMainContext()

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">굴림</span>
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
      <main className="p-4">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
