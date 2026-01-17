"use client";

import { cn } from "@repo/design-system/lib/utils";
import { useCallback, useEffect, useRef } from "react";

interface WheelPickerProps {
  items: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string | number) => void;
  itemHeight?: number;
  visibleItems?: number;
  className?: string;
}

export function WheelPicker({
  items,
  value,
  onChange,
  itemHeight = 44,
  visibleItems = 5,
  className,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = items.findIndex((item) => item.value === value);
  const centerOffset = Math.floor(visibleItems / 2);

  // 스크롤 위치로 선택된 아이템 계산
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isScrollingRef.current) return;

    // 스크롤 디바운스
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1));

      if (items[clampedIndex] && items[clampedIndex].value !== value) {
        onChange(items[clampedIndex].value);
      }

      // 스냅 스크롤
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: "smooth",
      });
    }, 100);
  }, [items, value, onChange, itemHeight]);

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (!containerRef.current) return;

    isScrollingRef.current = true;
    containerRef.current.scrollTop = selectedIndex * itemHeight;

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  }, [selectedIndex, itemHeight]);

  // 아이템 클릭 핸들러
  const handleItemClick = useCallback(
    (index: number) => {
      if (!containerRef.current) return;

      isScrollingRef.current = true;
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });

      if (items[index]) {
        onChange(items[index].value);
      }

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    },
    [items, onChange, itemHeight]
  );

  const containerHeight = visibleItems * itemHeight;
  const paddingHeight = centerOffset * itemHeight;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ height: containerHeight }}
    >
      {/* 선택 영역 하이라이트 - 회색 배경으로 변경하여 가시성 확보 */}
      <div
        className="absolute left-0 right-0 bg-gray-100/80 rounded-xl pointer-events-none z-10"
        style={{
          top: paddingHeight,
          height: itemHeight,
        }}
      />

      {/* 상단 그라데이션 - 흰색 배경과 자연스럽게 연결 */}
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-white via-white/90 to-transparent pointer-events-none z-20"
        style={{ height: paddingHeight }}
      />

      {/* 하단 그라데이션 */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none z-20"
        style={{ height: paddingHeight }}
      />

      {/* 스크롤 컨테이너 */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide relative z-30 bg-gray-50"
        onScroll={handleScroll}
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* 상단 패딩 */}
        <div style={{ height: paddingHeight }} />

        {/* 아이템 목록 */}
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const distance = Math.abs(index - selectedIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.2;
          const scale = distance === 0 ? 1.1 : distance === 1 ? 0.9 : 0.8;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleItemClick(index)}
              className={cn(
                "w-full flex items-center justify-center transition-all duration-200",
                isSelected
                  ? "font-bold text-gray-900"
                  : "text-gray-400 font-medium"
              )}
              style={{
                height: itemHeight,
                scrollSnapAlign: "center",
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              <span className="text-lg">{item.label}</span>
            </button>
          );
        })}

        {/* 하단 패딩 */}
        <div style={{ height: paddingHeight }} />
      </div>
    </div>
  );
}

interface YearMonthPickerProps {
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  startYear?: number;
  endYear?: number;
}

export function YearMonthPicker({
  year,
  month,
  onYearChange,
  onMonthChange,
  startYear = new Date().getFullYear() - 10,
  endYear = new Date().getFullYear() + 1,
}: YearMonthPickerProps) {
  // 연도 옵션 생성
  const yearItems = [];
  for (let y = startYear; y <= endYear; y++) {
    yearItems.push({ value: y, label: `${y}년` });
  }

  // 월 옵션 생성
  const monthItems = [];
  for (let m = 1; m <= 12; m++) {
    monthItems.push({ value: m, label: `${m}월` });
  }

  return (
    <div className="flex gap-4 px-2">
      <WheelPicker
        items={yearItems}
        value={year}
        onChange={(v) => onYearChange(Number(v))}
        className="flex-1"
        visibleItems={5}
      />
      <WheelPicker
        items={monthItems}
        value={month}
        onChange={(v) => onMonthChange(Number(v))}
        className="flex-1"
        visibleItems={5}
      />
    </div>
  );
}
