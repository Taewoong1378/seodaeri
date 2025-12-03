'use client';

import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface SmallBannerProps {
  title: string;
  description: string;
  image: string;
  link: string;
  gradient: string;
}

export function SmallBanner({
  title,
  description,
  image,
  link,
  gradient,
}: SmallBannerProps) {
  return (
    <Link href={link} className="block group">
      <div className="relative overflow-hidden rounded-[20px] shadow-md border border-white/5 transition-transform active:scale-[0.98]">
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-90`} />
        
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover opacity-40 mix-blend-overlay transition-transform duration-500 group-hover:scale-105"
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
