'use client';

import { Button } from '@repo/design-system/components/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/design-system/components/dialog';
import { Maximize2, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

interface LandscapeChartModalProps {
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
}

export function LandscapeChartModal({ title, children, trigger }: LandscapeChartModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-500 hover:text-white"
          onClick={() => setIsOpen(true)}
        >
          <Maximize2 size={16} />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-screen h-screen max-w-none m-0 p-0 bg-[#020617] border-none rounded-none flex items-center justify-center overflow-hidden">
          <DialogTitle className="sr-only">{title} 전체화면</DialogTitle>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white bg-black/20 backdrop-blur-sm rounded-full"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </Button>

          {/* Content Container */}
          <div
            className="w-full h-full flex flex-col p-6 transition-all duration-300 ease-in-out"
            style={{
              transform: isPortrait ? 'rotate(90deg)' : 'none',
              width: isPortrait ? '100vh' : '100vw',
              height: isPortrait ? '100vw' : '100vh',
              position: 'absolute',
              top: isPortrait ? '50%' : 0,
              left: isPortrait ? '50%' : 0,
              marginTop: isPortrait ? '-50vw' : 0,
              marginLeft: isPortrait ? '-50vh' : 0,
            }}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-xl font-bold text-white">{title}</h2>
            </div>
            
            <div className="flex-1 min-h-0 w-full relative">
              {/* Chart Container - passes dimensions to children */}
              <div className="absolute inset-0">
                {children}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
