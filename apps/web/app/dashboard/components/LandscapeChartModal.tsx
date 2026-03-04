'use client';

import { Button } from '@repo/design-system/components/button';
import { Dialog, DialogContent, DialogTitle } from '@repo/design-system/components/dialog';
import { Maximize2, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

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

  // Recharts wrapper의 getBoundingClientRect 캐시
  const getRechartsRect = useCallback(() => {
    const chartArea = chartAreaRef.current;
    if (!chartArea) return null;
    const wrapper = chartArea.querySelector('.recharts-wrapper');
    if (!wrapper) return null;
    return wrapper.getBoundingClientRect();
  }, []);

  // 90° CW 회전 후 좌표 보정
  // getBoundingClientRect()는 회전 후 width↔height가 뒤바뀜.
  // Recharts가 mouseOffset / rect.width 로 인덱스를 계산하므로 aspect ratio 보정 필요.
  const correctXY = useCallback((clientX: number, clientY: number, rect: DOMRect) => {
    const localX = clientY - rect.top;
    const localY = rect.right - clientX;
    return {
      clientX: localX * rect.width / rect.height + rect.left,
      clientY: localY * rect.height / rect.width + rect.top,
    };
  }, []);

  // Dialog 열린 동안 뒤쪽 페이지 터치/스크롤 완전 차단
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Dialog 바깥 터치 차단 (capture phase)
    const blockOutsideTouch = (e: Event) => {
      const dialogEl = document.querySelector('[data-state="open"][role="dialog"]');
      if (!dialogEl) return;
      const target = e.target as Element;
      if (target && !dialogEl.contains(target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    document.addEventListener('touchstart', blockOutsideTouch, true);
    document.addEventListener('touchmove', blockOutsideTouch, true);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.removeEventListener('touchstart', blockOutsideTouch, true);
      document.removeEventListener('touchmove', blockOutsideTouch, true);
    };
  }, [isOpen]);

  // 터치 → 보정된 mousemove 변환 (TouchEvent 재발행 없음)
  // 재발행 없이 mousemove만 발행하여 Dialog 깜빡임 방지
  useEffect(() => {
    if (!isPortrait || !isOpen) return;

    let isRedispatching = false;

    const handleTouch = (e: Event) => {
      if (isRedispatching) return;

      const te = e as TouchEvent;
      const chartArea = chartAreaRef.current;
      if (!chartArea) return;
      const target = e.target as Element;
      if (!target || !chartArea.contains(target)) return;

      const rect = getRechartsRect();
      if (!rect) return;

      e.preventDefault();
      e.stopPropagation();

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

      isRedispatching = true;
      try {
        const correctedTouches = mapTouches(te.touches);

        // 보정된 TouchEvent 재발행 (Area/Line Chart 호환)
        target.dispatchEvent(new TouchEvent(te.type, {
          bubbles: true,
          cancelable: true,
          touches: correctedTouches,
          changedTouches: mapTouches(te.changedTouches),
          targetTouches: mapTouches(te.targetTouches),
        }));

        // mousemove도 발행 (BarChart 마우스 기반 tooltip 호환)
        if (te.type === 'touchstart' || te.type === 'touchmove') {
          const t0 = correctedTouches[0];
          if (t0) {
            target.dispatchEvent(new MouseEvent('mousemove', {
              bubbles: true,
              cancelable: true,
              clientX: t0.clientX,
              clientY: t0.clientY,
            }));
          }
        } else if (te.type === 'touchend') {
          target.dispatchEvent(new MouseEvent('mouseleave', {
            bubbles: true,
            cancelable: true,
          }));
        }
      } catch { /* Touch constructor unavailable */ }
      isRedispatching = false;
    };

    // mousemove/pointermove 좌표 보정 (데스크톱 fallback)
    const handleMouse = (e: Event) => {
      if (isRedispatching) return; // synthetic 이벤트 이중 보정 방지
      const me = e as MouseEvent;
      const chartArea = chartAreaRef.current;
      if (!chartArea) return;
      const target = e.target as Element;
      if (!target || !chartArea.contains(target)) return;

      const rect = getRechartsRect();
      if (!rect) return;

      const c = correctXY(me.clientX, me.clientY, rect);
      try {
        Object.defineProperty(me, 'clientX', { value: c.clientX, configurable: true });
        Object.defineProperty(me, 'clientY', { value: c.clientY, configurable: true });
        Object.defineProperty(me, 'pageX', { value: c.clientX + window.scrollX, configurable: true });
        Object.defineProperty(me, 'pageY', { value: c.clientY + window.scrollY, configurable: true });
      } catch { /* ignore */ }
    };

    const touchTypes = ['touchstart', 'touchmove', 'touchend'];
    const mouseTypes = ['mousemove', 'pointermove'];

    for (const t of touchTypes) document.addEventListener(t, handleTouch, true);
    for (const t of mouseTypes) document.addEventListener(t, handleMouse, true);

    return () => {
      for (const t of touchTypes) document.removeEventListener(t, handleTouch, true);
      for (const t of mouseTypes) document.removeEventListener(t, handleMouse, true);
    };
  }, [isPortrait, isOpen, getRechartsRect, correctXY]);

  // 툴팁이 물리적 화면 경계를 넘지 않도록 rAF 루프로 지속 보정
  // MutationObserver 대신 rAF 사용하여 무한 루프 문제 없이 안정적으로 동작
  useEffect(() => {
    if (!isOpen) return;

    let rafId: number;
    let running = true;

    const MARGIN = 12;

    const clamp = () => {
      if (!running) return;

      const chartArea = chartAreaRef.current;
      if (chartArea) {
        const wrappers = chartArea.querySelectorAll<HTMLElement>('.recharts-tooltip-wrapper');
        for (const el of wrappers) {
          const currentTransform = el.style.transform;
          const prevTransform = el.dataset.clampTransform;

          // Recharts가 새 위치로 이동했으면 (다른 데이터 포인트) margin 리셋
          if (currentTransform !== prevTransform) {
            el.style.marginLeft = '';
            el.style.marginTop = '';
            el.dataset.clampTransform = currentTransform;
          }

          const curML = Number.parseFloat(el.style.marginLeft) || 0;
          const curMT = Number.parseFloat(el.style.marginTop) || 0;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const vh = window.innerHeight;
          const vw = window.innerWidth;

          let deltaLeft = 0;
          let deltaTop = 0;

          if (isPortrait) {
            // rotate(90° CW): marginLeft → 물리적 상하, marginTop → 물리적 좌우
            const overflowBottom = rect.bottom - (vh - MARGIN);
            const overflowTop = MARGIN - rect.top;
            if (overflowBottom > 1) deltaLeft = -overflowBottom;
            else if (overflowTop > 1) deltaLeft = overflowTop;

            const overflowRight = rect.right - (vw - MARGIN);
            const overflowLeft = MARGIN - rect.left;
            if (overflowRight > 1) deltaTop = overflowRight;
            else if (overflowLeft > 1) deltaTop = -overflowLeft;
          } else {
            const overflowRight = rect.right - (vw - MARGIN);
            if (overflowRight > 1) deltaLeft = -overflowRight;
            const overflowBottom = rect.bottom - (vh - MARGIN);
            if (overflowBottom > 1) deltaTop = -overflowBottom;
          }

          if (deltaLeft !== 0) el.style.marginLeft = `${curML + deltaLeft}px`;
          if (deltaTop !== 0) el.style.marginTop = `${curMT + deltaTop}px`;
        }
      }

      rafId = requestAnimationFrame(clamp);
    };

    rafId = requestAnimationFrame(clamp);
    return () => { running = false; cancelAnimationFrame(rafId); };
  }, [isOpen, isPortrait]);

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors"
          onClick={() => setIsOpen(true)}
        >
          <Maximize2 size={16} />
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="fixed left-0 top-0 w-screen h-screen max-w-none m-0 p-0 translate-x-0 translate-y-0 bg-background border-none rounded-none flex items-center justify-center overflow-visible z-[100] data-[state=open]:slide-in-from-bottom-0 data-[state=closed]:slide-out-to-bottom-0"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">{title} 전체화면</DialogTitle>

          {/* Content Container — transition 제거하여 터치 시 깜빡임 방지 */}
          <div
            className="w-full h-full flex flex-col"
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
                ? 'calc(1rem + env(safe-area-inset-right))'
                : 'calc(1rem + env(safe-area-inset-top))',
              paddingBottom: isPortrait
                ? 'calc(1.5rem + env(safe-area-inset-left))'
                : 'calc(0.75rem + env(safe-area-inset-bottom))',
              paddingLeft: isPortrait
                ? 'calc(1rem + env(safe-area-inset-top))'
                : 'calc(1rem + env(safe-area-inset-left))',
              paddingRight: isPortrait
                ? 'calc(0.75rem + env(safe-area-inset-bottom))'
                : 'calc(0.75rem + env(safe-area-inset-right))',
            }}
          >
            <div className="flex items-center justify-between mb-2 shrink-0">
              <h2 className="text-xl font-bold text-foreground flex-1 text-center">{title}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 text-muted-foreground hover:text-foreground bg-muted/50 backdrop-blur-sm rounded-full"
                onClick={() => setIsOpen(false)}
              >
                <X size={28} />
              </Button>
            </div>

            <div ref={chartAreaRef} className="flex-1 min-h-0 w-full relative overflow-visible">
              <div className="absolute inset-0 overflow-visible">
                {children}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
