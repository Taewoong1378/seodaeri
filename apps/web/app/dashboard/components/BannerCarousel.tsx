"use client";

import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCarouselBanners } from '../../../lib/banner-data';

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
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi]
  );

  return (
    <div className="relative overflow-hidden rounded-[24px] shadow-lg">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {BANNERS.map((banner) => (
            <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative">
              {banner.link ? (
                <Link href={banner.link} target="_blank" className="block">
                  <div className="relative w-full h-36 sm:h-44">
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      className="object-cover"
                      priority={banner.id === 1}
                    />
                  </div>
                </Link>
              ) : (
                <div className="relative w-full h-36 sm:h-44">
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    className="object-cover"
                    priority={banner.id === 1}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      {BANNERS.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {BANNERS.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "w-5 bg-white"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              onClick={() => scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
