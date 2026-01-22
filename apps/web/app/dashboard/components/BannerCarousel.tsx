'use client';

import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCarouselBanners, getIconElement } from '../../../lib/banner-data';

export function BannerCarousel(): ReactElement | null {
  const { data: session } = useSession();

  // 데모 모드에서는 배너 숨김 (Play Store 심사용)
  const BANNERS = useMemo(() => {
    if (session?.isDemo) return [];
    return getCarouselBanners();
  }, [session?.isDemo]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 배너가 없으면 렌더링 안함
  if (BANNERS.length === 0) {
    return null;
  }

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  return (
    <div className="relative overflow-hidden rounded-[24px] shadow-lg border border-white/5">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {BANNERS.map((banner) => (
            <div
              key={banner.id}
              className="flex-[0_0_100%] min-w-0 relative"
            >
              <div
                className={`w-full min-h-[12rem] h-auto sm:h-56 bg-gradient-to-br ${banner.bgGradient} p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden`}
              >
                {/* Background Image (with fallback to gradient) */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    className="object-cover opacity-60 mix-blend-overlay"
                    priority={banner.id === 1}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-br ${banner.bgGradient} opacity-90 mix-blend-multiply`} />
                </div>

                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl z-0" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl z-0" />

                <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-4 h-full sm:h-auto">
                  <div className="space-y-2 max-w-full sm:max-w-[70%]">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] sm:text-xs font-medium text-white/90">
                        Sponsored
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                      {banner.title}
                    </h2>
                    <p className="text-sm sm:text-base text-white/80 font-medium">
                      {banner.description}
                    </p>
                    <p className="text-xs sm:text-sm text-white/60 mt-1">
                      {banner.subtext}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 shadow-inner">
                    {getIconElement(banner.iconName)}
                  </div>
                </div>

                <div className="mt-6 sm:mt-0 sm:absolute sm:bottom-8 sm:right-8 relative z-20 self-end">
                  {banner.link ? (
                    <Link href={banner.link} target="_blank">
                      <button
                        type="button"
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-bold shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                      >
                        {banner.action}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-bold shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                    >
                      {banner.action}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-6 flex gap-2 z-20">
        {BANNERS.map((banner, index) => (
          <button
            key={banner.id}
            type="button"
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? 'w-6 bg-white'
                : 'bg-white/40 hover:bg-white/60'
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
