// src/renderer/components/ui/ThemeToggle.tsx

import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'pf-theme'
const RIPPLE_MS = 900

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [rippleKey, setRippleKey] = useState(0)
  const [showRipple, setShowRipple] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* noop */ }
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY)) return
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Esconde o ripple depois da duração — à prova de falhas
  // mesmo se o @keyframes não estiver definido no CSS.
  useEffect(() => {
    if (!showRipple) return
    const t = window.setTimeout(() => setShowRipple(false), RIPPLE_MS)
    return () => window.clearTimeout(t)
  }, [showRipple, rippleKey])

  const toggle = () => {
    // Reinicia a animação do ripple via remount controlado
    setShowRipple(false)
    setRippleKey((k) => k + 1)
    requestAnimationFrame(() => setShowRipple(true))

    const root = document.documentElement
    root.classList.add('theme-transition')
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
    window.setTimeout(() => root.classList.remove('theme-transition'), 220)
  }

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      data-theme-transition-ignore
      onClick={toggle}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={cn(
        'group relative inline-flex items-center justify-center',
        'h-9 w-9 rounded-full cursor-pointer select-none',
        'border overflow-hidden',
        'transition-[transform,background-color,border-color,box-shadow]',
        'duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        isDark
          ? 'border-petrol-700 bg-petrol-900 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06)]'
          : 'border-amber-300 bg-amber-100 shadow-[inset_0_1px_2px_rgba(120,53,15,0.10)]',
        'hover:scale-[1.07] active:scale-95'
      )}
    >
      {/* ═══ Camada de profundidade — idêntica nos dois temas ═══ */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.16), transparent 55%)',
        }}
      />

      {/* ═══ Glow externo ═══ */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -inset-1.5 rounded-full blur-md',
          isDark ? 'bg-petrol-500/25' : 'bg-orange-300/30'
        )}
      />

      {/* ═══ Ripple de clique ═══
          Animação via style inline — não depende do Tailwind gerar
          `animate-celestial-ripple`. opacity: 0 é o estado padrão:
          se a animação por algum motivo não rodar, ele fica invisível
          em vez de virar uma camada sólida sobre o botão. */}
      {showRipple && (
        <span
          key={rippleKey}
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full',
            isDark ? 'bg-petrol-400' : 'bg-orange-400'
          )}
          style={{
            opacity: 0,
            animation: `celestial-ripple ${RIPPLE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          }}
        />
      )}

      {/* ═══ Astro central ═══ */}
      <svg
        viewBox="0 0 24 24"
        className={cn(
          'relative w-5 h-5 transition-colors duration-[600ms]',
          isDark ? 'text-petrol-100' : 'text-orange-500'
        )}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <mask
            id="pf-celestial-mask"
            maskUnits="userSpaceOnUse"
            x="-12" y="-12" width="48" height="48"
          >
            <rect x="-12" y="-12" width="48" height="48" fill="white" />
            <circle
              cx={isDark ? 19 : 50}
              cy={isDark ? 6 : -26}
              r="9"
              fill="black"
              style={{
                transition:
                  'cx 800ms cubic-bezier(0.65, 0, 0.35, 1), ' +
                  'cy 800ms cubic-bezier(0.65, 0, 0.35, 1)',
              }}
            />
          </mask>

          <filter id="pf-sun-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        {/* Corona solar */}
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="#FB923C"
          filter="url(#pf-sun-blur)"
          style={{
            transformOrigin: '12px 12px',
            transform: isDark ? 'scale(0.5)' : 'scale(1)',
            opacity: isDark ? 0 : 0.65,
            transition:
              'transform 800ms cubic-bezier(0.16,1,0.3,1), ' +
              'opacity 600ms ease',
          }}
        />

        {/* Estrelas */}
        <g
          fill="white"
          className="transition-opacity duration-[600ms]"
          style={{ opacity: isDark ? 1 : 0 }}
        >
          <circle cx="4.6"  cy="4.4"  r="0.85" style={{ animation: 'twinkle 2.4s ease-in-out infinite' }} />
          <circle cx="20.2" cy="3.6"  r="0.7"  style={{ animation: 'twinkle 2.4s ease-in-out infinite', animationDelay: '0.4s' }} />
          <circle cx="3.4"  cy="19.2" r="0.6"  style={{ animation: 'twinkle 2.4s ease-in-out infinite', animationDelay: '0.9s' }} />
          <circle cx="20.6" cy="19.8" r="0.75" style={{ animation: 'twinkle 2.4s ease-in-out infinite', animationDelay: '1.4s' }} />
        </g>

        {/* Raios do sol */}
        <g
          style={{
            transformOrigin: '12px 12px',
            transform: isDark
              ? 'scale(0.15) rotate(-90deg)'
              : 'scale(1) rotate(0deg)',
            opacity: isDark ? 0 : 1,
            transition:
              'transform 800ms cubic-bezier(0.16,1,0.3,1), ' +
              'opacity 500ms ease',
          }}
        >
          <g
            style={{
              transformOrigin: '12px 12px',
              animation: isDark ? 'none' : 'sun-rays-spin 28s linear infinite',
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i * 45 * Math.PI) / 180
              const x1 = 12 + Math.cos(a) * 5.6
              const y1 = 12 + Math.sin(a) * 5.6
              const x2 = 12 + Math.cos(a) * 8.4
              const y2 = 12 + Math.sin(a) * 8.4
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              )
            })}
          </g>
        </g>

        {/* Corpo central */}
        <circle
          cx="12" cy="12" r="6.2"
          fill="currentColor"
          mask="url(#pf-celestial-mask)"
        />

        {/* Highlight de vidro */}
        <circle
          cx="9.6" cy="9.4" r="1.3"
          fill="white"
          opacity={isDark ? 0.20 : 0.55}
          className="transition-opacity duration-[600ms]"
        />
      </svg>
    </button>
  )
}