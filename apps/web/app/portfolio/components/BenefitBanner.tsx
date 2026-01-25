'use client';

import { ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { getBenefitBanner } from '../../../lib/banner-data';

export function BenefitBanner() {
  const { data: session } = useSession();

  // 데모 모드에서는 배너 숨김 (Play Store 심사용)
  const bannerData = useMemo(() => {
    if (session?.isDemo) return null;
    return getBenefitBanner();
  }, [session?.isDemo]);

  const handleTrackClick = useCallback(() => {
    console.log('[Tracking] Benefit Banner Clicked');
  }, []);

  if (!bannerData) {
    return null;
  }

  return (
    <Link
      href={bannerData.link}
      target="_blank"
      onClick={handleTrackClick}
      className="block"
    >
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
        <div className="relative p-4 flex items-center gap-4">
          {/* 이미지 */}
          <div className={`relative w-14 h-14 rounded-xl overflow-hidden ring-2 ${bannerData.highlightColor.replace('text-', 'ring-')}/40 shadow-lg shrink-0`}>
            <Image
              src={bannerData.image}
              alt={bannerData.title}
              fill
              className="object-cover"
            />
          </div>

          {/* 텍스트 */}
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-bold ${bannerData.highlightColor}`}>
              {bannerData.highlight}
            </span>
            <p className="text-sm font-semibold text-foreground truncate">
              {bannerData.title}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {bannerData.subtitle}
            </p>
          </div>

          {/* 화살표 버튼 */}
          <div className={`w-9 h-9 rounded-full ${bannerData.buttonBg} flex items-center justify-center shadow-md shrink-0`}>
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}
