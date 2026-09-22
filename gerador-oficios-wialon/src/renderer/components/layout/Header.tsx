import { NavLink, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import logoForce from '../../../assets/logo-force2.png'

interface HeaderProps {
  onRefresh: () => void
  loading?: boolean
}

const TABS = [
  { to: '/infracoes', label: 'Infrações' },
  { to: '/detran', label: 'Consulta DETRAN' },
  { to: '/configuracoes', label: 'Configurações' },
]

export function Header({ onRefresh, loading }: HeaderProps) {
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false })

  const activeIndex = TABS.findIndex((t) => location.pathname.startsWith(t.to))

  useLayoutEffect(() => {
    const el = TABS[activeIndex] ? linkRefs.current[TABS[activeIndex].to] : null
    if (el) {
      setPill({
        left: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      })
    }
  }, [activeIndex, location.pathname])

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-lg shadow-slate-950/20">
      <div className="w-full px-6 h-16 flex items-center justify-between">
        {/* Lado Esquerdo: Logo e Título */}
        <div className="flex items-center gap-3">
          <img
            src={logoForce}
            alt="Force"
            className="h-9 w-auto object-contain brightness-0 invert"
          />
        </div>

        {/* Lado Direito: Navegação e Botão Atualizar */}
        <div className="flex items-center gap-4">
          <nav
            ref={navRef}
            className="relative hidden sm:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-inner"
          >
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-lg bg-cyan-400 shadow-sm transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: pill.left,
                width: pill.width,
                opacity: pill.ready ? 1 : 0,
              }}
            />

            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                ref={(el) => {
                  linkRefs.current[tab.to] = el
                }}
                className={({ isActive }) =>
                  `relative z-10 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-300 ${isActive
                    ? 'text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 border border-slate-700/80 shadow-sm active:scale-95"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Atualizar</span>
          </button>
        </div>
      </div>
    </header>
  )
}