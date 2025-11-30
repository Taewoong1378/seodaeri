'use client';

import { cn } from '@repo/design-system/lib/utils';
import { History, Home, PieChart, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: '홈', icon: Home },
  { href: '/transactions', label: '내역', icon: History },
  { href: '/portfolio', label: '포트폴리오', icon: PieChart },
  { href: '/settings', label: '설정', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-t border-border/40 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-around h-[60px]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col items-center justify-center w-full h-full space-y-[4px] active:scale-95 transition-transform duration-100",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative p-1.5 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                <Icon 
                  size={22} 
                  className={cn(
                    "transition-all duration-300",
                    isActive && "scale-105"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? "currentColor" : "none"}
                  fillOpacity={isActive ? 0.2 : 0}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors duration-200",
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
