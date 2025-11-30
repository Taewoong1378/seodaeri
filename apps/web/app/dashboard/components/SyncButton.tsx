'use client';

import { Button } from '@repo/design-system/components/button';
import { RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { syncPortfolio } from '../../actions/dashboard';

export function SyncButton() {
  const [isPending, startTransition] = useTransition();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSync = () => {
    setIsAnimating(true);
    startTransition(async () => {
      try {
        await syncPortfolio();
      } finally {
        // 최소 1초는 애니메이션 유지
        setTimeout(() => setIsAnimating(false), 1000);
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
      onClick={handleSync}
      disabled={isPending}
    >
      <RefreshCw
        size={16}
        className={isAnimating || isPending ? 'animate-spin' : ''}
      />
    </Button>
  );
}
