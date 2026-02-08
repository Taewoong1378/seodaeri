'use client';

import { Button } from '@repo/design-system/components/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/design-system/components/dialog';
import { Maximize2, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

interface LandscapeChartModalProps {
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
}

export function LandscapeChartModal({ title, children, trigger }: LandscapeChartModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // CSS rotate(90deg)로 인해 Recharts 좌표 계산이 틀어지는 문제 보정
  // 90° CW 회전 시: local_x = clientY - rect.top, local_y = rect.right - clientX
  // document capture phase에서 React root보다 먼저 이벤트를 가로채서
  // 보정된 좌표로 새 이벤트를 재발행함
  useEffect(() => {
    if (!isPortrait || !isOpen) return;

    let isRedispatching = false;

    const getRect = () => {
      const chartArea = chartAreaRef.current;
      if (!chartArea) return null;
      const wrapper = chartArea.querySelector('.recharts-wrapper');
      if (!wrapper) return null;
      return wrapper.getBoundingClientRect();
    };

    const correctXY = (clientX: number, clientY: number, rect: DOMRect) => ({
      clientX: clientY - rect.top + rect.left,
      clientY: rect.right + rect.top - clientX,
    });

    const handleTouch = (e: Event) => {
      if (isRedispatching) return;
      const te = e as TouchEvent;

      const chartArea = chartAreaRef.current;
      if (!chartArea) return;
      const target = e.target as Element;
      if (!target || !chartArea.contains(target)) return;

      const rect = getRect();
      if (!rect) return;

      const mapTouches = (list: TouchList): Touch[] =>
        Array.from(list).map((t) => {
          const c = correctXY(t.clientX, t.clientY, rect);
          return new Touch({
            identifier: t.identifier,
            target: t.target as Element,
            clientX: c.clientX,
            clientY: c.clientY,
            pageX: c.clientX + window.scrollX,
            pageY: c.clientY + window.scrollY,
            screenX: c.clientX,
            screenY: c.clientY,
          });
        });

      e.stopPropagation();

      isRedispatching = true;
      try {
        const newEvent = new TouchEvent(te.type, {
          bubbles: true,
          cancelable: true,
          touches: mapTouches(te.touches),
          changedTouches: mapTouches(te.changedTouches),
          targetTouches: mapTouches(te.targetTouches),
        });
        target.dispatchEvent(newEvent);
      } catch { /* Touch constructor unavailable */ }
      isRedispatching = false;
    };

    const handleMouse = (e: Event) => {
      if (isRedispatching) return;
      const me = e as MouseEvent;

      const chartArea = chartAreaRef.current;
      if (!chartArea) return;
      const target = e.target as Element;
      if (!target || !chartArea.contains(target)) return;

      const rect = getRect();
      if (!rect) return;

      const c = correctXY(me.clientX, me.clientY, rect);

      // MouseEvent/PointerEvent의 clientX/clientY는 prototype getter이므로
      // instance property로 shadow 가능
      try {
        Object.defineProperty(me, 'clientX', { value: c.clientX, configurable: true });
        Object.defineProperty(me, 'clientY', { value: c.clientY, configurable: true });
        Object.defineProperty(me, 'pageX', { value: c.clientX + window.scrollX, configurable: true });
        Object.defineProperty(me, 'pageY', { value: c.clientY + window.scrollY, configurable: true });
        return; // 성공 시 이벤트 그대로 전파
      } catch { /* fallback to re-dispatch */ }

      // defineProperty 실패 시 재발행
      e.stopPropagation();
      isRedispatching = true;
      try {
        const Ctor = (e instanceof PointerEvent) ? PointerEvent : MouseEvent;
        const init: MouseEventInit = {
          bubbles: true,
          cancelable: true,
          clientX: c.clientX,
          clientY: c.clientY,
          screenX: c.clientX,
          screenY: c.clientY,
          button: me.button,
          buttons: me.buttons,
        };
        target.dispatchEvent(new Ctor(me.type, init));
      } catch { /* ignore */ }
      isRedispatching = false;
    };

    const touchTypes = ['touchstart', 'touchmove', 'touchend'];
    const mouseTypes = ['mousemove', 'mousedown', 'mouseup', 'click', 'pointermove', 'pointerdown', 'pointerup'];

    touchTypes.forEach((t) => document.addEventListener(t, handleTouch, true));
    mouseTypes.forEach((t) => document.addEventListener(t, handleMouse, true));

    return () => {
      touchTypes.forEach((t) => document.removeEventListener(t, handleTouch, true));
      mouseTypes.forEach((t) => document.removeEventListener(t, handleMouse, true));
    };
  }, [isPortrait, isOpen]);

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
          className="h-8 w-8 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors"
          onClick={() => {
            console.log('Opening landscape modal');
            setIsOpen(true);
          }}
        >
          <Maximize2 size={16} />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="fixed left-0 top-0 w-screen h-screen max-w-none m-0 p-0 translate-x-0 translate-y-0 bg-background border-none rounded-none flex items-center justify-center overflow-hidden z-[100] data-[state=open]:slide-in-from-bottom-0 data-[state=closed]:slide-out-to-bottom-0">
          <DialogTitle className="sr-only">{title} 전체화면</DialogTitle>


          {/* Content Container */}
          <div
            className="w-full h-full flex flex-col transition-all duration-300 ease-in-out"
            style={{
              transform: isPortrait ? 'rotate(90deg)' : 'none',
              width: isPortrait ? '100vh' : '100vw',
              height: isPortrait ? '100vw' : '100vh',
              position: 'absolute',
              top: isPortrait ? '50%' : 0,
              left: isPortrait ? '50%' : 0,
              marginTop: isPortrait ? '-50vw' : 0,
              marginLeft: isPortrait ? '-50vh' : 0,

              // Safe Area Handling
              paddingTop: isPortrait
                ? 'calc(1.5rem + env(safe-area-inset-right))'
                : 'calc(1.5rem + env(safe-area-inset-top))',
              paddingBottom: isPortrait
                ? 'calc(1.5rem + env(safe-area-inset-left))'
                : 'calc(1.5rem + env(safe-area-inset-bottom))',
              paddingLeft: isPortrait
                ? 'calc(1.5rem + env(safe-area-inset-top))'
                : 'calc(1.5rem + env(safe-area-inset-left))',
              paddingRight: isPortrait
                ? 'calc(1.5rem + env(safe-area-inset-bottom))'
                : 'calc(1.5rem + env(safe-area-inset-right))',
            }}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground bg-muted/50 backdrop-blur-sm rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X size={24} />
              </Button>
            </div>

            <div ref={chartAreaRef} className="flex-1 min-h-0 w-full relative">
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
