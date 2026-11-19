// apps/detran/src/renderer/components/layout/Header.tsx

import logoForce from '../../shared/assets/logo-force2.png'
import { ThemeToggle } from '../../shared/ui/ThemeToggle'

export function Header() {
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

        <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-petrol-800 self-center shrink-0 transition-colors" />

        {/* ═══ Título do app ═══ */}
        <div className="flex items-center text-[13px] font-semibold text-petrol-700 dark:text-petrol-300">
          Consulta DETRAN-CE
        </div>

        <div className="flex-1" />

        {/* ═══ Direita ═══ */}
        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
