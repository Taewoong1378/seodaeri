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
        <div onClick={() => {
          console.log('Opening landscape modal');
          setIsOpen(true);
        }}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => {
            console.log('Opening landscape modal');
            setIsOpen(true);
          }}
        >
          <Maximize2 size={16} />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="fixed left-0 top-0 w-screen h-screen max-w-none m-0 p-0 translate-x-0 translate-y-0 bg-[#020617] border-none rounded-none flex items-center justify-center overflow-hidden z-[100] data-[state=open]:slide-in-from-bottom-0 data-[state=closed]:slide-out-to-bottom-0">
          <DialogTitle className="sr-only">{title} 전체화면</DialogTitle>
          


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
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white bg-black/20 backdrop-blur-sm rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X size={24} />
              </Button>
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
