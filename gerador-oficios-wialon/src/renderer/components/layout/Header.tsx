// src/renderer/components/layout/Header.tsx

import { NavLink, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import logoForce from '../../../assets/logo-force2.png'
import { cn } from '../../lib/cn'
import { ThemeToggle } from '../ui/ThemeToggle'

export type InfracoesAba = 'OPERACIONAL' | 'HISTORICO'

interface HeaderProps {
  onRefresh: () => void
  loading?: boolean
  /** Aba ativa dentro do módulo de infrações */
  infracoesAba?: InfracoesAba
  onInfracoesAbaChange?: (aba: InfracoesAba) => void
  /** Status da integração Wialon (só aparece em /infracoes) */
  wialonConectado?: boolean
}

const TABS_GLOBAIS = [
  { to: '/infracoes', label: 'Infrações' },
  { to: '/detran', label: 'Consulta DETRAN' },
  { to: '/configuracoes', label: 'Configurações' },
]

const TABS_INFRACOES: { id: InfracoesAba; label: string }[] = [
  { id: 'OPERACIONAL', label: 'Operacional' },
  { id: 'HISTORICO', label: 'Histórico' },
]

export function Header({
  onRefresh,
  loading,
  infracoesAba = 'OPERACIONAL',
  onInfracoesAbaChange,
  wialonConectado = true,
}: HeaderProps) {
  const location = useLocation()
  const emInfracoes = location.pathname.startsWith('/infracoes')

  return (
    <header className="bg-white dark:bg-petrol-950 border-b border-slate-200 dark:border-petrol-800 sticky top-0 z-40 transition-colors">
      <div className="h-14 px-5 flex items-stretch gap-4">

        {/* ═══ Logo ═══ */}
        <div className="flex items-center shrink-0">
          <img
            src={logoForce}
            alt="Force"
            className="h-7 w-auto object-contain dark:brightness-0 dark:invert"
          />
        </div>

        {/* ═══ Divisor ═══ */}
        <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-petrol-800 self-center shrink-0 transition-colors" />

        {/* ═══ Navegação global ═══ */}
        <nav className="hidden sm:flex items-stretch shrink-0">
          {TABS_GLOBAIS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center h-full px-3.5 text-[13px] transition-colors',
                  isActive
                    ? 'text-petrol-700 dark:text-petrol-300 font-semibold'
                    : 'text-slate-500 dark:text-petrol-300/60 hover:text-slate-900 dark:hover:text-white font-medium'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {tab.label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute -bottom-px left-0 right-0 h-0.5 bg-petrol-600 dark:bg-petrol-400 transition-colors"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ═══ Subnavegação (só em /infracoes) ═══ */}
        {emInfracoes && (
          <>
            <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-petrol-800 self-center shrink-0 transition-colors" />

            <nav className="hidden sm:flex items-stretch shrink-0">
              {TABS_INFRACOES.map((tab) => {
                const ativa = infracoesAba === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onInfracoesAbaChange?.(tab.id)}
                    className={cn(
                      'relative flex items-center h-full px-3.5 text-[13px] transition-colors cursor-pointer',
                      ativa
                        ? 'text-petrol-700 dark:text-petrol-300 font-semibold'
                        : 'text-slate-500 dark:text-petrol-300/60 hover:text-slate-900 dark:hover:text-white font-medium'
                    )}
                  >
                    {tab.label}
                    {ativa && (
                      <span
                        aria-hidden
                        className="absolute -bottom-px left-0 right-0 h-0.5 bg-petrol-600 dark:bg-petrol-400 transition-colors"
                      />
                    )}
                  </button>
                )
              })}
            </nav>
          </>
        )}

        {/* ═══ Espaçador ═══ */}
        <div className="flex-1" />

        {/* ═══ Direita: Wialon + toggle de tema + ação contextual ═══ */}
        <div className="flex items-center gap-2.5 shrink-0">
          {emInfracoes && <WialonStatus conectado={wialonConectado} />}

          {/* Divisor sutil entre status e ações */}
          {emInfracoes && (
            <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-petrol-800 transition-colors" />
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-md',
              'bg-white dark:bg-petrol-900',
              'hover:bg-slate-50 dark:hover:bg-petrol-800',
              'border border-slate-200 dark:border-petrol-800',
              'text-slate-700 dark:text-petrol-200',
              'text-[12px] font-semibold shadow-sm transition cursor-pointer',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title={emInfracoes ? 'Sincronizar dados' : 'Atualizar dados'}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span className="hidden md:inline">
              {emInfracoes ? 'Sincronizar' : 'Atualizar'}
            </span>
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

/* ═══ Subcomponente: status do Wialon ═══ */

function WialonStatus({ conectado }: { conectado: boolean }) {
  return (
    <div className="hidden md:flex items-center gap-1.5">
      <span className="relative flex w-1.5 h-1.5">
        {conectado && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-50 soft-ping" />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full w-1.5 h-1.5',
            conectado ? 'bg-emerald-500' : 'bg-rose-500'
          )}
        />
      </span>
      <span
        className={cn(
          'text-[11px] font-medium transition-colors',
          conectado
            ? 'text-slate-600 dark:text-petrol-300/70'
            : 'text-rose-600 dark:text-rose-400'
        )}
      >
        {conectado ? 'Wialon conectado' : 'Wialon offline'}
      </span>
    </div>
  )
}