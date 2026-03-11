'use client'

import { usePathname } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'

function NavigationProgressInner() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const prevPathRef = useRef(pathname)

  const startProgress = useCallback(() => {
    setVisible(true)
    setProgress(0)

    if (intervalRef.current) clearInterval(intervalRef.current)

    let currentProgress = 0
    intervalRef.current = setInterval(() => {
      currentProgress += Math.random() * 15
      if (currentProgress > 90) currentProgress = 90
      setProgress(currentProgress)
    }, 200)
  }, [])

  const completeProgress = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setProgress(100)
    const timeout = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      completeProgress()
      prevPathRef.current = pathname
    }
  }, [pathname, completeProgress])

  // Intercept internal link clicks to detect navigation start
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (!link) return

      const href = link.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:'))
        return
      if (link.getAttribute('target') === '_blank') return
      if (href === pathname) return

      startProgress()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [pathname, startProgress])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-100 h-[2px] bg-primary/10">
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
