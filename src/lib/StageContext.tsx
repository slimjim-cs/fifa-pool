'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

type Stage = 'group' | 'knockout'

interface StageContextType {
  stage: Stage
  setStage: (s: Stage) => void
  toggleStage: () => void
}

const StageContext = createContext<StageContextType>({
  stage: 'group',
  setStage: () => {},
  toggleStage: () => {},
})

const STORAGE_KEY = 'fifa-pool-stage'

export function StageProvider({ children }: { children: ReactNode }) {
  const [stage, setStageState] = useState<Stage>('group')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'group' || stored === 'knockout') {
      setStageState(stored)
    }
    setHydrated(true)
  }, [])

  const setStage = useCallback((s: Stage) => {
    setStageState(s)
    localStorage.setItem(STORAGE_KEY, s)
  }, [])

  const toggleStage = useCallback(() => {
    setStageState((prev) => {
      const next = prev === 'group' ? 'knockout' : 'group'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  if (!hydrated) {
    return <>{children}</>
  }

  return (
    <StageContext.Provider value={{ stage, setStage, toggleStage }}>
      {children}
    </StageContext.Provider>
  )
}

export const useStage = () => useContext(StageContext)
