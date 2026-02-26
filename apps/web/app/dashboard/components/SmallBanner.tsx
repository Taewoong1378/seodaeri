'use client';

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
  image,
  link,
}: SmallBannerProps) {
  return (
    <Link href={link} className="block group">
      <div className="relative overflow-hidden rounded-[20px] shadow-md transition-transform active:scale-[0.98]">
        <div className="relative w-full h-28">
          <Image
            src={image}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>
    </Link>
  );
}
