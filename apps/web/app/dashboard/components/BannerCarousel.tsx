'use client';

import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, Building2, TrendingUp, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

const BANNERS = [
  {
    id: 1,
    title: 'KODEX 미국배당프리미엄',
    description: '매월 받는 월배당 ETF의 정석',
    subtext: 'S&P500 상승분과 배당수익을 동시에',
    bgGradient: 'from-blue-700 to-slate-900',
    image: '/images/banners/banner-kodex-etf.png',
    icon: <TrendingUp className="w-12 h-12 text-white/90" />,
    action: '상품 확인하기',
  },
  {
    id: 2,
    title: '키움증권 X 서대리',
    description: '서대리 구독자 전용 특별 혜택',
    subtext: '해외주식 환전 우대 95% + $40 즉시 지급',
    bgGradient: 'from-pink-600 to-rose-900',
    image: '/images/banners/banner-kiwoom-event.png',
    icon: <TrendingUp className="w-12 h-12 text-white/90" />,
    action: '이벤트 확인',
  },
  {
    id: 3,
    title: '토스증권 주식 모으기',
    description: '매일 커피 한 잔 값으로 시작하는 투자',
    subtext: '서대리 추천 포트폴리오 원클릭 매수',
    bgGradient: 'from-emerald-600 to-teal-900',
    image: '/images/banners/banner-toss-collection.png',
    icon: <Wallet className="w-12 h-12 text-white/90" />,
    action: '시작하기',
  },
  {
    id: 4,
    title: '미래에셋증권 연금저축',
    description: '노후 준비는 서대리와 함께',
    subtext: '개인연금/IRP 이전 시 신세계 상품권 증정',
    bgGradient: 'from-orange-500 to-amber-800',
    image: '/images/banners/banner-mirae-pension.png',
    icon: <Building2 className="w-12 h-12 text-white/90" />,
    action: '자세히 보기',
  },
];

export function BannerCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
                className={`w-full h-48 sm:h-56 bg-gradient-to-br ${banner.bgGradient} p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden`}
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
                    {banner.icon}
                  </div>
                </div>

                    <div className="mt-6 sm:mt-0 sm:absolute sm:bottom-8 sm:right-8">
                      <button
                        type="button"
                        className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-bold shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                      >
                        {banner.action}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </button>
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
