// src/hooks/useTheme.ts
import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'pf-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  // Sincroniza com mudança do sistema se o usuário ainda não escolheu
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY)) return
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return { theme, toggle, setTheme }
}