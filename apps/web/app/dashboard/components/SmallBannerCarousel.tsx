'use client';

import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { SmallBannerItem } from '../../../lib/banner-data';

interface SmallBannerCarouselProps {
  items: SmallBannerItem[];
}

function SmallBannerSlide({ title, description, image, link, gradient }: SmallBannerItem) {
  return (
    <Link href={link} className="block group">
      <div className="relative overflow-hidden rounded-[20px] shadow-md border border-white/5 transition-transform active:scale-[0.98]">
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-40`} />

        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="relative z-10 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {title}
            </h3>
            <p className="text-sm text-white/80 font-medium">
              {description}
            </p>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function SmallBannerCarousel({ items }: SmallBannerCarouselProps) {
  if (items.length === 0) {
    return null;
  }

  if (items.length === 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return <SmallBannerSlide {...items[0]!} />;
  }

  return <SmallBannerCarouselMulti items={items} />;
}

function SmallBannerCarouselMulti({ items }: { items: SmallBannerItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false }),
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
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((item) => (
            <div key={item.id} className="flex-[0_0_100%] min-w-0">
              <SmallBannerSlide {...item} />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? 'w-4 bg-foreground/50'
                : 'w-1.5 bg-foreground/20 hover:bg-foreground/30'
            }`}
            onClick={() => scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
