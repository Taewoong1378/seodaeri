'use client'

import { cn } from '@repo/design-system/lib/utils'
import { useCallback, useEffect, useRef } from 'react'

interface WheelPickerProps {
  items: { value: string | number; label: string }[]
  value: string | number
  onChange: (value: string | number) => void
  itemHeight?: number
  visibleItems?: number
  className?: string
  circular?: boolean
}

const CIRCULAR_REPEATS = 100 // 충분히 많은 반복 (사실상 무한 스크롤)

export function WheelPicker({
  items,
  value,
  onChange,
  itemHeight = 44,
  visibleItems = 5,
  className,
  circular = false,
}: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedIndex = items.findIndex((item) => item.value === value)
  const centerOffset = Math.floor(visibleItems / 2)

  // circular 모드: 아이템을 N번 반복, 중간 세트에서 시작
  const middleSetStart = Math.floor(CIRCULAR_REPEATS / 2) * items.length
  const totalItems = circular ? items.length * CIRCULAR_REPEATS : items.length

  // 현재 값의 가상 인덱스 (circular일 때 중간 세트 기준)
  const virtualSelectedIndex = circular ? middleSetStart + selectedIndex : selectedIndex

  // 가상 인덱스 → 실제 아이템 인덱스
  const toRealIndex = (virtualIdx: number) => {
    if (!circular) return virtualIdx
    return ((virtualIdx % items.length) + items.length) % items.length
  }

  // 스크롤 위치로 선택된 아이템 계산
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isScrollingRef.current) return

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return

      const scrollTop = containerRef.current.scrollTop
      const newVirtualIndex = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(newVirtualIndex, totalItems - 1))
      const realIndex = toRealIndex(clampedIndex)

      if (items[realIndex] && items[realIndex].value !== value) {
        onChange(items[realIndex].value)
      }

      // 스냅 스크롤
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth',
      })
    }, 100)
  }, [items, value, onChange, itemHeight, circular, totalItems])

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (!containerRef.current) return

    isScrollingRef.current = true
    containerRef.current.scrollTop = virtualSelectedIndex * itemHeight

    setTimeout(() => {
      isScrollingRef.current = false
    }, 100)
  }, [virtualSelectedIndex, itemHeight])

  // 아이템 클릭 핸들러
  const handleItemClick = useCallback(
    (virtualIndex: number) => {
      if (!containerRef.current) return

      isScrollingRef.current = true
      containerRef.current.scrollTo({
        top: virtualIndex * itemHeight,
        behavior: 'smooth',
      })

      const realIndex = toRealIndex(virtualIndex)
      if (items[realIndex]) {
        onChange(items[realIndex].value)
      }

      setTimeout(() => {
        isScrollingRef.current = false
      }, 300)
    },
    [items, onChange, itemHeight, circular],
  )

  const containerHeight = visibleItems * itemHeight
  const paddingHeight = centerOffset * itemHeight

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ height: containerHeight }}>
      {/* 선택 영역 하이라이트 */}
      <div
        className="absolute left-0 right-0 bg-gray-100/80 rounded-xl pointer-events-none z-10"
        style={{
          top: paddingHeight,
          height: itemHeight,
        }}
      />

      {/* 상단 그라데이션 */}
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
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* 상단 패딩 */}
        <div style={{ height: paddingHeight }} />

        {/* 아이템 목록 */}
        {Array.from({ length: totalItems }, (_, virtualIndex) => {
          const realIndex = toRealIndex(virtualIndex)
          const item = items[realIndex]
          if (!item) return null
          const isSelected = virtualIndex === virtualSelectedIndex
          const distance = Math.abs(virtualIndex - virtualSelectedIndex)
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.2
          const scale = distance === 0 ? 1.1 : distance === 1 ? 0.9 : 0.8

          return (
            <button
              key={`${virtualIndex}`}
              type="button"
              onClick={() => handleItemClick(virtualIndex)}
              className={cn(
                'w-full flex items-center justify-center transition-all duration-200',
                isSelected ? 'font-bold text-gray-900' : 'text-gray-400 font-medium',
              )}
              style={{
                height: itemHeight,
                scrollSnapAlign: 'center',
                opacity,
              }}
            >
              <span
                className="text-lg inline-block"
                style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}

        {/* 하단 패딩 */}
        <div style={{ height: paddingHeight }} />
      </div>
    </div>
  )
}

interface YearMonthPickerProps {
  year: number
  month: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  startYear?: number
  endYear?: number
}

export function YearMonthPicker({
  year,
  month,
  onYearChange,
  onMonthChange,
  startYear = new Date().getFullYear() - 10,
  endYear = new Date().getFullYear(),
}: YearMonthPickerProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // 연도 옵션: 당년까지만 (미래 연도 제외)
  const clampedEndYear = Math.min(endYear, currentYear)
  const yearItems = []
  for (let y = startYear; y <= clampedEndYear; y++) {
    yearItems.push({ value: y, label: `${y}년` })
  }

  // 월 옵션: 당년이면 현재월까지, 과거 연도면 1~12월
  const maxMonth = year === currentYear ? currentMonth : 12
  const monthItems = []
  for (let m = 1; m <= maxMonth; m++) {
    monthItems.push({ value: m, label: `${m}월` })
  }

  // 연도 변경 시 월이 범위를 벗어나면 clamp
  const handleYearChange = (newYear: number) => {
    onYearChange(newYear)
    const newMaxMonth = newYear === currentYear ? currentMonth : 12
    if (month > newMaxMonth) {
      onMonthChange(newMaxMonth)
    }
  }

  return (
    <div className="flex gap-4 px-2">
      <WheelPicker
        items={yearItems}
        value={year}
        onChange={(v) => handleYearChange(Number(v))}
        className="flex-1"
        visibleItems={5}
      />
      <WheelPicker
        items={monthItems}
        value={month}
        onChange={(v) => onMonthChange(Number(v))}
        className="flex-1"
        visibleItems={5}
        circular={year !== currentYear}
      />
    </div>
  )
}
