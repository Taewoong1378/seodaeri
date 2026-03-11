'use client'

import { createContext, useContext } from 'react'

interface MainContextValue {
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
  isDemo: boolean
  sheetUrl: string | null
  isStandalone: boolean
  isAdmin: boolean
}

const MainContext = createContext<MainContextValue | null>(null)

export function MainProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: MainContextValue
}) {
  return <MainContext.Provider value={value}>{children}</MainContext.Provider>
}

export function useMainContext() {
  const ctx = useContext(MainContext)
  if (!ctx) throw new Error('useMainContext must be used within MainProvider')
  return ctx
}
