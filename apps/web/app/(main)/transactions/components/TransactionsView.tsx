'use client'

import { Button } from '@repo/design-system/components/button'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { BottomNav } from '../../dashboard/components/BottomNav'
import { useMainContext } from '../../providers'
import { TransactionsSkeleton } from './TransactionsSkeleton'
import { TransactionsWrapper } from './TransactionsWrapper'

export function TransactionsView() {
  const { user, sheetUrl } = useMainContext()

  // Transactions page uses sheetUrl with #gid=0
  const transactionsSheetUrl = sheetUrl ? `${sheetUrl}#gid=0` : null

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">내역</span>
        <div className="flex items-center gap-3">
          {transactionsSheetUrl && (
            <Link href={transactionsSheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1.5"
              >
                <ExternalLink size={14} />
                시트 열기
              </Button>
            </Link>
          )}
          {user.image && (
            <Image
              src={user.image}
              alt={user.name || '프로필'}
              width={32}
              height={32}
              className="rounded-full border border-border"
            />
          )}
        </div>
      </header>
      <main className="p-5 space-y-4">
        <Suspense fallback={<TransactionsSkeleton />}>
          <TransactionsWrapper />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
