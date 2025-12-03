'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';

export function BenefitBanner() {
  const handleTrackClick = useCallback(() => {
    // Mock tracking function
    console.log('[Tracking] Account Opening Clicked');
    // In a real app, this would send an event to analytics (e.g., PostHog, GA)
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-white/[0.03] border border-white/10 p-1 shadow-sm">
      <div className="relative bg-[#020617]/40 backdrop-blur-sm rounded-[20px] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden sm:block relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-inner shrink-0">
             <Image
              src="/images/banners/banner-benefit-kiwoom.png"
              alt="키움증권 혜택"
              fill
              className="object-cover"
            />
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">
              키움증권 계좌 개설하고
            </h3>
            <p className="text-sm text-slate-400 font-medium">
              최대 <span className="text-white font-bold">40달러</span> 투자지원금 받기
            </p>
          </div>
        </div>

        <Link
          href="https://www.kiwoom.com"
          target="_blank"
          onClick={handleTrackClick}
          className="w-full sm:w-auto"
        >
          <button
            type="button"
            className="w-full sm:w-auto group flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all active:scale-95 whitespace-nowrap border border-white/5"
          >
            혜택받기
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </Link>
      </div>
    </div>
  );
}
